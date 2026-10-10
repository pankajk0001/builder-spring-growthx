const {test}=require('node:test'),assert=require('node:assert/strict');
const {ensureActivity,recordActivity,summarizeActivity,observeActivity,activityMarkers}=require('../src/admin-activity.cjs');
const now=Date.parse('2026-10-11T12:00:00Z'),day=86400000;
const club=()=>({id:'cedar',identity:{secretaryId:'15550000001@s.whatsapp.net'},state:{stage:'complete',approvedHash:'existing',helperGroupPost:{id:'old-post',status:'sent',serverAckVerified:true}}});
test('seven-day Secretary activity excludes club activity, expired events and outgoing Secretaries',()=>{
 const c=club();ensureActivity(c,now-10*day);
 recordActivity(c,'secretary_message','old',now-8*day,now);
 recordActivity(c,'member_reply','member',now-day,now);
 assert.equal(summarizeActivity(c,now).secretaryActive,false);
 assert.equal(summarizeActivity(c,now).clubActive,true);
 recordActivity(c,'secretary_message','private',now,now);
 assert.equal(summarizeActivity(c,now).secretaryActive,true);
 c.identity.secretaryId='15550000002@s.whatsapp.net';
 assert.equal(summarizeActivity(c,now).secretaryActive,false);
 assert.equal(summarizeActivity(c,now).memberReplies,1);
});
test('activity survives restart without double counts or saved message bodies',()=>{
 const c=club();ensureActivity(c,now);
 recordActivity(c,'secretary_message','secret-source-id',now,now);
 const restarted=JSON.parse(JSON.stringify(c));
 assert.equal(recordActivity(restarted,'secretary_message','secret-source-id',now,now),false);
 assert.equal(summarizeActivity(restarted,now).secretaryMessages,1);
 assert.ok(!JSON.stringify(c.activity).includes('secret-source-id'));
 assert.ok(!JSON.stringify(c.activity).includes('15550000001'));
 assert.equal(recordActivity(c,'member_reply','future',now+day,now),false);
});
test('old successful boards are baseline only; uncertain and failed sends are never successful posts',()=>{
 const c=club();ensureActivity(c,now);let previous=activityMarkers(c);
 observeActivity(c,previous,now);assert.equal(summarizeActivity(c,now).boardsPosted,0);
 c.state.memberLive={posts:{due:{id:'new-post',status:'sending'}}};
 observeActivity(c,previous,now);previous=activityMarkers(c);
 assert.equal(summarizeActivity(c,now).boardsPosted,0);
 c.state.memberLive.posts.due.status='sent';c.state.memberLive.posts.due.serverAckVerified=true;
 observeActivity(c,previous,now);previous=activityMarkers(c);
 observeActivity(c,previous,now);
 recordActivity(c,'delivery_failure','failed-send',now,now);
 const summary=summarizeActivity(c,now);assert.equal(summary.boardsPosted,1);assert.equal(summary.deliveryFailures,1);
 assert.equal(summary.secretaryActive,false);assert.equal(summary.clubActive,true);
});
test('missing history stays unavailable; retention and overflow cannot silently report complete counts',()=>{
 const c=club();assert.equal(summarizeActivity(c,now),null);ensureActivity(c,now-day);
 recordActivity(c,'member_reply','before-install',now-2*day,now);
 assert.equal(summarizeActivity(c,now).memberReplies,0);
 c.activity.truncatedAt=now;
 assert.equal(summarizeActivity(c,now).complete,false);
 assert.equal(summarizeActivity(c,now+8*day).complete,true);
});
