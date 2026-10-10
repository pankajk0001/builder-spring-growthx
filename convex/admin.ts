import {query,mutation,internalQuery,internalMutation} from './_generated/server';
import {getAuthUserId} from '@convex-dev/auth/server';
import {v,ConvexError} from 'convex/values';
import {account,snapshot,health,actionKind,actionStatus,actionView} from './adminValues';
import {isOwner} from './adminPolicy';
import type {QueryCtx} from './_generated/server';
async function requireOwner(ctx:QueryCtx){
 const id=await getAuthUserId(ctx);const user=id?await ctx.db.get(id):null;
 if(!user||!isOwner(user.email,!!user.emailVerificationTime,process.env.ADMIN_OWNER_EMAIL))throw new ConvexError('Owner access required.');
 return user._id;
}
export const overview=query({args:{},returns:v.object({health:v.union(health,v.null()),capturedAt:v.union(v.number(),v.null()),count:v.number(),connected:v.number(),paused:v.number(),attention:v.number(),accounts:v.array(account)}),handler:async ctx=>{
 await requireOwner(ctx);
 const meta=await ctx.db.query('adminSnapshot').withIndex('by_key',q=>q.eq('key','latest')).unique();
 const rows=await ctx.db.query('adminAccounts').withIndex('by_account').take(250);
 return {health:meta?.health??null,capturedAt:meta?.capturedAt??null,count:meta?.count??0,connected:meta?.connected??0,paused:meta?.paused??0,attention:meta?.attention??0,accounts:rows.map(r=>r.account)};
}});
export const replace=internalMutation({args:{snapshot},returns:v.null(),handler:async(ctx,{snapshot:s})=>{
 if(s.accounts.length>250||new Set(s.accounts.map(a=>a.id)).size!==s.accounts.length||s.accounts.some(a=>a.approved.length>30||a.current.length>30||(a.draft?.roles.length||0)>30||a.deliveries.length>20))throw Error('Invalid snapshot.');
 if(s.capturedAt>Date.now()+60000||s.capturedAt<Date.now()-300000)throw Error('Snapshot time is invalid.');
 const meta=await ctx.db.query('adminSnapshot').withIndex('by_key',q=>q.eq('key','latest')).unique();
 if(meta&&s.capturedAt<=meta.capturedAt)return null;
 const old=await ctx.db.query('adminAccounts').withIndex('by_account').take(251);if(old.length>250)throw Error('Snapshot capacity exceeded.');
 for(const row of old)if(!s.accounts.some(a=>a.id===row.account.id))await ctx.db.delete(row._id);
 for(const a of s.accounts){const row=old.find(r=>r.account.id===a.id);const value={account:a,capturedAt:s.capturedAt};if(row)await ctx.db.replace(row._id,value);else await ctx.db.insert('adminAccounts',value);}
 const value={key:'latest' as const,...(s.health?{health:s.health}:{}),capturedAt:s.capturedAt,count:s.accounts.length,connected:s.accounts.filter(a=>a.connected).length,paused:s.accounts.filter(a=>a.paused).length,attention:s.accounts.filter(a=>a.needsAttention).length};
 if(meta)await ctx.db.replace(meta._id,value);else await ctx.db.insert('adminSnapshot',value);return null;
}});
export const requestControl=mutation({args:{clubId:v.string(),kind:actionKind,expected:v.string(),nonce:v.string()},returns:v.id('adminActions'),handler:async(ctx,args)=>{
 const owner=await requireOwner(ctx),now=Date.now();
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(args.nonce))throw new ConvexError('Invalid request.');
 const existing=await ctx.db.query('adminActions').withIndex('by_nonce',q=>q.eq('nonce',args.nonce)).unique();
 if(existing){if(existing.owner!==owner||existing.clubId!==args.clubId||existing.kind!==args.kind||existing.expected!==args.expected)throw new ConvexError('Invalid repeated request.');return existing._id;}
 const meta=await ctx.db.query('adminSnapshot').withIndex('by_key',q=>q.eq('key','latest')).unique();
 const row=await ctx.db.query('adminAccounts').withIndex('by_account',q=>q.eq('account.id',args.clubId)).unique();
 if(!row||!meta||now-meta.capturedAt>180000||!meta.health?.service?.connected||!meta.health.service.controlsCheckedAt||now-meta.health.service.controlsCheckedAt>120000)throw new ConvexError('The helper is unavailable or its status is delayed. Refresh before trying again.');
 const a=row.account;
 if(!a.control||a.control.token!==args.expected||a.paused!==(args.kind==='resume'))throw new ConvexError('The account changed. Refresh and confirm again.');
 if(args.kind==='resume'&&a.control.resumeBlocked)throw new ConvexError(a.control.resumeBlocked);
 const pending=await ctx.db.query('adminActions').withIndex('by_club',q=>q.eq('clubId',args.clubId)).order('desc').take(20);
 // The helper decides expiration: an earlier request may already have been saved
 // successfully while its acknowledgement was lost. Never guess its outcome here.
 for(const p of pending)if(p.status==='pending'&&now-p.requestedAt<=300000)return p._id;
 return await ctx.db.insert('adminActions',{...args,club:a.club,owner,requestedAt:now,status:'pending'});
}});
export const controlHistory=query({args:{clubId:v.string()},returns:v.array(actionView),handler:async(ctx,{clubId})=>{
 await requireOwner(ctx);const rows=await ctx.db.query('adminActions').withIndex('by_club',q=>q.eq('clubId',clubId)).order('desc').take(20);
 return rows.map(r=>({id:r._id,clubId:r.clubId,club:r.club,kind:r.kind,requestedAt:r.requestedAt,completedAt:r.completedAt??null,status:r.status,message:r.message??null}));
}});
export const pendingControls=internalQuery({args:{},returns:v.array(v.object({id:v.id('adminActions'),clubId:v.string(),kind:actionKind,expected:v.string(),requestedAt:v.number()})),handler:async ctx=>{
 const rows=await ctx.db.query('adminActions').withIndex('by_status',q=>q.eq('status','pending')).order('asc').take(20);
 return rows.map(r=>({id:r._id,clubId:r.clubId,kind:r.kind,expected:r.expected,requestedAt:r.requestedAt}));
}});
export const completeControl=internalMutation({args:{id:v.id('adminActions'),status:actionStatus,message:v.string(),completedAt:v.number()},returns:v.null(),handler:async(ctx,args)=>{
 const row=await ctx.db.get(args.id);if(!row)throw Error('Unknown action.');
 if(args.status==='pending'||args.message.length>300||args.completedAt>Date.now()+60000||args.completedAt<row.requestedAt-60000)throw Error('Invalid result.');
 if(row.status==='pending')await ctx.db.patch(row._id,{status:args.status,message:args.message,completedAt:args.completedAt});return null;
}});
