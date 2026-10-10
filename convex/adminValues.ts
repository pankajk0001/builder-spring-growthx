import { v } from 'convex/values';
const nullable=v.union(v.string(),v.null());
export const role=v.object({role:v.string(),member:nullable});
export const meeting=v.object({club:nullable,number:nullable,date:nullable,time:nullable,venue:nullable});
export const account=v.object({id:v.string(),club:v.string(),secretary:v.string(),group:nullable,connected:v.boolean(),paused:v.boolean(),stage:v.string(),postingTime:nullable,nextUpdate:nullable,meeting,approved:v.array(role),current:v.array(role),draft:v.union(v.object({stage:v.string(),meeting,roles:v.array(role)}),v.null()),deliveries:v.array(v.object({status:v.string(),postedAt:nullable,acknowledged:v.boolean()})),needsAttention:v.boolean()});
export const snapshot=v.object({capturedAt:v.number(),accounts:v.array(account)});
