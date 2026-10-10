import {query,internalMutation} from './_generated/server';
import {getAuthUserId} from '@convex-dev/auth/server';
import {v} from 'convex/values';
import {account,snapshot} from './adminValues';
import {isOwner} from './adminPolicy';
import type {QueryCtx} from './_generated/server';
async function requireOwner(ctx:QueryCtx){
 const id=await getAuthUserId(ctx);const user=id?await ctx.db.get(id):null;
 if(!user||!isOwner(user.email,!!user.emailVerificationTime,process.env.ADMIN_OWNER_EMAIL))throw Error('Owner access required.');
}
export const overview=query({args:{},returns:v.object({capturedAt:v.union(v.number(),v.null()),count:v.number(),connected:v.number(),paused:v.number(),attention:v.number(),accounts:v.array(account)}),handler:async ctx=>{
 await requireOwner(ctx);
 const meta=await ctx.db.query('adminSnapshot').withIndex('by_key',q=>q.eq('key','latest')).unique();
 const rows=await ctx.db.query('adminAccounts').withIndex('by_account').take(250);
 return {capturedAt:meta?.capturedAt??null,count:meta?.count??0,connected:meta?.connected??0,paused:meta?.paused??0,attention:meta?.attention??0,accounts:rows.map(r=>r.account)};
}});
export const replace=internalMutation({args:{snapshot},returns:v.null(),handler:async(ctx,{snapshot:s})=>{
 if(s.accounts.length>250||new Set(s.accounts.map(a=>a.id)).size!==s.accounts.length||s.accounts.some(a=>a.approved.length>30||a.current.length>30||(a.draft?.roles.length||0)>30||a.deliveries.length>20))throw Error('Invalid snapshot.');
 if(s.capturedAt>Date.now()+60000||s.capturedAt<Date.now()-300000)throw Error('Snapshot time is invalid.');
 const meta=await ctx.db.query('adminSnapshot').withIndex('by_key',q=>q.eq('key','latest')).unique();
 if(meta&&s.capturedAt<=meta.capturedAt)return null;
 const old=await ctx.db.query('adminAccounts').withIndex('by_account').take(251);if(old.length>250)throw Error('Snapshot capacity exceeded.');
 for(const row of old)if(!s.accounts.some(a=>a.id===row.account.id))await ctx.db.delete(row._id);
 for(const a of s.accounts){const row=old.find(r=>r.account.id===a.id);const value={account:a,capturedAt:s.capturedAt};if(row)await ctx.db.replace(row._id,value);else await ctx.db.insert('adminAccounts',value);}
 const value={key:'latest' as const,capturedAt:s.capturedAt,count:s.accounts.length,connected:s.accounts.filter(a=>a.connected).length,paused:s.accounts.filter(a=>a.paused).length,attention:s.accounts.filter(a=>a.needsAttention).length};
 if(meta)await ctx.db.replace(meta._id,value);else await ctx.db.insert('adminSnapshot',value);return null;
}});
