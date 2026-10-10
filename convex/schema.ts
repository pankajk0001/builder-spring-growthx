import {defineSchema,defineTable} from 'convex/server';
import {v} from 'convex/values';
import {authTables} from '@convex-dev/auth/server';
import {account,health} from './adminValues';
export default defineSchema({...authTables,
 adminAccounts:defineTable({account,capturedAt:v.number()}).index('by_account',['account.id']),
 adminSnapshot:defineTable({key:v.literal('latest'),health:v.optional(health),capturedAt:v.number(),count:v.number(),connected:v.number(),paused:v.number(),attention:v.number()}).index('by_key',['key'])
});
