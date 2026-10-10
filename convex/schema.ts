import {defineSchema,defineTable} from 'convex/server';
import {v} from 'convex/values';
import {authTables} from '@convex-dev/auth/server';
import {account,health,actionKind,actionStatus} from './adminValues';
export default defineSchema({...authTables,
 adminActions:defineTable({clubId:v.string(),club:v.string(),kind:actionKind,expected:v.string(),nonce:v.string(),owner:v.id('users'),requestedAt:v.number(),completedAt:v.optional(v.number()),status:actionStatus,message:v.optional(v.string())}).index('by_club',['clubId','requestedAt']).index('by_status',['status','requestedAt']).index('by_nonce',['nonce']),
 adminAccounts:defineTable({account,capturedAt:v.number()}).index('by_account',['account.id']),
 adminSnapshot:defineTable({key:v.literal('latest'),health:v.optional(health),capturedAt:v.number(),count:v.number(),connected:v.number(),paused:v.number(),attention:v.number()}).index('by_key',['key'])
});
