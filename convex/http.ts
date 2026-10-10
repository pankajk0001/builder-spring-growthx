import {httpRouter} from 'convex/server';
import {httpAction} from './_generated/server';
import {internal} from './_generated/api';
import {auth} from './auth';
import {validSyncSecret} from './adminPolicy';
const http=httpRouter();auth.addHttpRoutes(http);
http.route({path:'/admin/snapshot',method:'POST',handler:httpAction(async(ctx,request)=>{
 if(!validSyncSecret(request.headers.get('authorization'),process.env.ADMIN_SYNC_SECRET))return new Response('Unauthorized',{status:401});
 const body=await request.text();if(body.length>2000000)return new Response('Too large',{status:413});
 try{await ctx.runMutation(internal.admin.replace,{snapshot:JSON.parse(body)});return new Response(null,{status:204});}
 catch{return new Response('Snapshot rejected',{status:400});}
})});
http.route({path:'/admin/actions',method:'GET',handler:httpAction(async(ctx,request)=>{
 if(!validSyncSecret(request.headers.get('authorization'),process.env.ADMIN_SYNC_SECRET))return new Response('Unauthorized',{status:401});
 return Response.json(await ctx.runQuery(internal.admin.pendingControls,{}),{headers:{'cache-control':'no-store'}});
})});
http.route({path:'/admin/actions',method:'POST',handler:httpAction(async(ctx,request)=>{
 if(!validSyncSecret(request.headers.get('authorization'),process.env.ADMIN_SYNC_SECRET))return new Response('Unauthorized',{status:401});
 const body=await request.text();if(body.length>2000)return new Response('Too large',{status:413});
 try{await ctx.runMutation(internal.admin.completeControl,JSON.parse(body));return new Response(null,{status:204});}
 catch{return new Response('Result rejected',{status:400});}
})});
export default http;
