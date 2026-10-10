import Google from '@auth/core/providers/google';
import {convexAuth} from '@convex-dev/auth/server';
import {isOwner} from './adminPolicy';
export const {auth,signIn,signOut,store,isAuthenticated}=convexAuth({
 providers:[Google({authorization:{params:{scope:'openid email',prompt:'select_account'}},profile(profile){return {id:profile.sub,email:profile.email,emailVerified:profile.email_verified===true};}})],
 callbacks:{async createOrUpdateUser(ctx,args){
  if(args.provider.id!=='google'||!isOwner(args.profile.email,args.profile.emailVerified,process.env.ADMIN_OWNER_EMAIL)) throw Error('This admin panel is restricted to its owner.');
  if(args.existingUserId){await ctx.db.patch(args.existingUserId,{email:args.profile.email,emailVerificationTime:Date.now()});return args.existingUserId;}
  return ctx.db.insert('users',{email:args.profile.email,emailVerificationTime:Date.now()});
 },redirect:async()=>process.env.SITE_URL+'/admin.html'}
});
