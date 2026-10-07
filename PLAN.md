# Plan

Build one milestone at a time, in the order listed in PRODUCT.md. Milestone 1 approved on 2026-10-07.

## Test boundary and acceptance

- Latest user correction overrides earlier reply examples: only update the group table, without individual role replies or public conflict notes. Unclear questions remain private to the Secretary.

- Use only the user's test WhatsApp group named `Test_group`. Never read from or send to the real club group.
- All test boards, names, and messages must be made up.
- Clarification questions go privately to the Secretary. For this test, the authorized private destination is the paired account's self-chat; the real club remains excluded.
- Milestone 1 is complete only when the updated table and the made-up messages it was built from are visible in `Test_group`.
- Current status: the user confirmed the fictional source and updated table on WhatsApp, then confirmed the private Secretary clarification. The group table was corrected and verified through WhatsApp. Milestone 1 is confirmed; its code is saved locally. GitHub is connected as `pankajk0001`, with write access to the configured repository.
- The runner limits input to 300 fictional messages, requests `max_output_tokens: 500`, and permits at most 100 AI requests per rolling hour through a locked laptop ledger. It reserves a conservative API-equivalent budget of at most $5; Codex subscription allowance is governed by the signed-in account, not by an API provider spending limit.
- Verification: all 15 Node test entries pass, including four Python checks for persistent rate and budget limits. The live WhatsApp test passed; re-running it confirmed that a completed test does not post duplicates.
- Correction verified: the group table was edited to remove the Secretary clarification, and the user confirmed receiving the private clarification in self-chat. All 19 Node test entries now pass, including checks for private routing and send receipts.

## Milestones


- [x] 1. Read WhatsApp chatter and the current role board, then show the updated board in a table (verified with made-up data in Test_group).
- [x] 2. When someone messages with a role name, check whether that role is open or already filled, and by whom (verified with fictional data in Test_group and confirmed on the phone).
- [x] 3. Generate the role board as an image with the same layout and every name in the correct slot (square preview confirmed directly in WhatsApp self-chat).
- [x] 4. Get the Secretary's approval to post the board at the time they select (confirmed in Secretary self-chat).
- [x] 5. Post the board in the WhatsApp group (approved fictional image delivered to Test_group and confirmed on the phone).
- [x] 6. Let the Secretary edit a role on the board (private table, corrections, preview, approval, Test_group delivery and private confirmation checked on the phone).
- [x] 7. Close and reopen the helper, and confirm the board is still there (restored private table confirmed on the phone).
- [x] 8. Set a weekly private reminder, catch up once after a missed reminder, prepare a fresh board with open roles, add speakers, and approve its first group post (bounded WhatsApp test confirmed; missed-week behavior covered by tests).
- [x] 9. Connect live Test_group role replies to the current board and automatic changed-board posting at 20:00 India time, following the existing product schedule (phone claims and private clarification verified; authorized short-time automatic image test confirmed).
- [x] 10. Repost only when roles differ from the last posted board, and base the cycle on any meeting day, ending at 20:00 India time the day before the meeting (Sunday dated board confirmed on the phone; all seven days and unchanged-board checks tested).
- [x] 11. Save the usual meeting day and time during setup, then fill both on every fresh weekly board (Sunday 4:30 PM saved; auto-filled fresh preview confirmed on the phone).
- [x] 12. Run the existing bounded Test_group helper on an Oracle Always Free server; preserve the board and schedule, restart automatically, and verify WhatsApp operation while the laptop helper is stopped. Approved by the user. Separate-number Secretary setup and multiple-club support follow after this hosting milestone. No paid API fallback, credits purchase or paid hosting upgrade is authorized.

- Hosting implementation: Ubuntu Always Free server uses the existing paired Test_group account, private state and subscription-only Hermes credentials. Laptop runner stopped and blocked from opening a second connection. Exact approved Mac PNGs are preserved with input and image checksums; edits get new server previews. Private restored-table receipt acknowledged; hosted AI correctly ignored chatter and identified Timer availability. Normal restart and automatic recovery both reconnected without duplicate sends. All 15 visible roles inspected: TMOD pankaj Example and Speaker 1 JJ Example; other roles open. Approved post remains 8 October 2026 at 20:00 India time, weekly reminder Monday 19:00, usual meeting Sunday 2:30 PM. All 150 local tests pass; server full suite and targeted hosting checks pass, with the laptop-only launcher check skipped there. Fixed restart verification of a board awaiting its first post. The user confirmed TABLE on mobile data with the laptop off; milestone 12 is confirmed. The server remains limited to the fictional Test_group flow; real Secretary setup is next.

- Full setup repeat confirmed: user answered reminder day/time, usual meeting day, and usual meeting time in sequence. Current saved settings are Monday 19:00 reminder and Sunday 2:30 PM meeting. Fresh 11 October, 2:30 PM private preview was acknowledged and confirmed on the phone; posted board restored and helper restarted without a group repost.

## Milestone 1 approach

- Inspect the existing Hermes setup on the laptop and its WhatsApp connection.
- Read the current board and up to 300 messages through Hermes, and identify role changes using the AI settings in AGENTS.md.
- Preserve existing assignments when someone else requests a filled role. Ask the Secretary for help when a reply is unclear.
- Return the updated board as a text table in WhatsApp, without generating or posting a board image yet.
- Enforce the AI call and reply limits on the laptop, keep credentials out of code, and return the retry message when a call fails or a cap is reached.
- Use only made-up names and messages in tests. Check assignments, withdrawals, unrelated chatter, conflicting requests, and unclear replies.
- Verify the flow in a test WhatsApp group and explain how to check it on a phone before requesting milestone confirmation.
- After the user confirms it works, commit, push, update PROGRESS.md, and deploy as required by AGENTS.md.

## Milestone 2 approach

- Approved by the user on 2026-10-07. All 27 tests pass; five role replies and the final table were posted and read back in Test_group. WhatsApp confirmed the private clarification send. The user confirmed the group results and private clarification on the phone; milestone 2 is complete for the bounded test flow.
- Reply with the current holder for filled roles; never replace them.
- Answer availability questions without assigning a role. An explicit claim or bare role name takes an open role.
- Apply requests in message order so later requests see earlier assignments.
- Keep unclear-role questions in the Secretary's self-chat.
- Prove the flow using six fictional messages, five group replies, and a final table in Test_group; ask the user to check the phone before marking it complete.

## Additional milestone 2 check

- User requested everyday chatter mixed with role-board messages.
- Posted 11 wholly fictional messages in Test_group: five everyday messages and six role-related messages.
- Live Hermes interpretation ignored all five everyday messages, including unrelated mentions of timer and listener; five correct role replies and the unchanged expected final board were posted and read back. The unclear request was sent privately to Secretary self-chat.
- All 28 automated tests pass. Awaiting the user's phone check before pushing this additional checkpoint.

## 60-message milestone 2 check

- User requested a longer conversation; generated exactly 60 fictional messages (48 everyday messages and 12 role-related messages).
- Posted the source transcript in Test_group and verified its readback. Six live Hermes calls interpreted ten messages each, carrying the updated board forward while retaining all existing call and reply limits.
- Verified all 48 chatter messages were ignored, eleven correct role replies, and the final board: Timer Mira Example, Listener Lena Example, Grammarian Iris Example. WhatsApp confirmed the unclear request was sent only to Secretary self-chat.
- All 29 automated tests pass. The user confirmed the final table and private clarification on the phone; this additional checkpoint is ready to push.

## Table-only correction check

- User requested no individual role replies, only the updated table.
- Removed public conflict notes and per-message group sends; retained holder protection, withdrawals, availability checks, and private Secretary clarification.
- Replayed all 60 fictional messages through six live Hermes calls. Recorded the actual group sends and verified exactly one final table after the source transcript, with no role replies. All 48 everyday messages were ignored; final holders remained Timer Mira Example, Listener Lena Example, Grammarian Iris Example. WhatsApp confirmed private clarification delivery.
- All 31 tests pass, including checks that extra replies or duplicate tables fail verification. The user confirmed seeing only the updated table after the latest test source on the phone; this correction is confirmed.

## Milestone 3 approach and verification

- User approved matching the supplied local board reference on 2026-10-07.
- Render a PNG directly from board data: blue section headers, red two-column rows, matching role order, three paired speaker/evaluator rows, and the closing message. Use Inter and a fictional club badge rather than copying real club details.
- Every role maps to one explicit slot. Open roles display Open; names wrap and rows expand to prevent overlap. Unknown or missing slots fail instead of silently dropping data.
- Generated and visually inspected a 1312 × 2062 fictional board containing all 15 roles. WhatsApp confirmed the exact image checksum and source-table caption sent only to the paired Secretary self-chat, without any group sends.
- All 37 tests pass, including slot mapping, pairing, long names, missing/unknown roles, destination restrictions, and image verification.
- The user confirmed the layout and names, then confirmed the corrected square preview directly in chat; milestone 3 is complete. Approval scheduling and group image posting remain milestones 4 and 5.

## Milestone 3 chat-preview correction

- User confirmed the original layout and name placement, then requested a preview visible after downloading without opening gallery view.
- Changed the board to a compact square (1:1), preserving all sections, holders, open roles, and speaker/evaluator pairings. Long names expand the square rather than clipping rows.
- Visually inspected the 1700 × 1700 preview. Sent the corrected image privately with an explicitly generated full-board thumbnail and image dimensions; WhatsApp confirmed the image checksum, caption, thumbnail and dimensions. No group sends.
- All 39 tests pass, including square output for long names and refusal to verify a changed thumbnail or wrong dimensions.
- The user confirmed the whole downloaded square image is visible directly in WhatsApp chat without opening the gallery; milestone 3 is complete.

## Milestone 4 approach

- User approved private board approval and selection of a posting date and time on 2026-10-07.
- Send the exact phone-confirmed square fictional board to Secretary self-chat. Accept APPROVE only from fresh phone-originated events in that self-chat.
- Ask one question at a time: approval, date and 24-hour time in India time, then CONFIRM after displaying the exact date/time and Test_group destination.
- Bind final approval to the preview's image hash. Reject other people, group messages, old history, duplicate events, invalid/past dates, and confirmation after the selected time has passed. A changed board clears earlier approval and time.
- Save state and pending private replies atomically outside the repository. The 15-minute test listener resumes the saved request on rerun.
- All 53 automated tests pass. Real phone replies advanced through APPROVE, time selection, and CONFIRM. Fixed device-specific self-chat addresses, fresh delayed events, and premature connection shutdown after the final reply. The final confirmation was resent and acknowledged by WhatsApp; the user confirmed the phone flow; no group posting or delivery scheduler is enabled in this milestone.

## Pre-approval editing brought forward

- User approved bringing pre-approval editing forward from milestone 6.
- Preview offers APPROVE, EDIT, or CANCEL. EDIT asks for corrections such as Timer: Noel Example or Timer: Open; several corrections can be sent together, one per line or separated by semicolons; existing role assignments and club/meeting details can be corrected.
- A correction generates a new square preview and clears all previous approval and posting-time fields. The changed image must be approved again, with a new date/time confirmation. Quoted replies to older previews cannot approve the new one.
- Live checks use made-up names ending Example and fictional club names containing Example. Existing approved test state was archived locally before starting a fresh edit check.
- All 70 tests pass. The live single correction reopened Timer and produced a square preview acknowledged by WhatsApp. The user requested several corrections at once; batch validation is atomic and produces one preview. Invalid corrections are quoted with their reason; valid lines are retained privately so only the invalid lines need to be resent. Partial retries keep remaining invalid lines unresolved. The user confirmed the live multi-correction and invalid-line retry flow on the phone. Saved state is approved, with no unresolved corrections or pending replies; renewed approval and final WhatsApp acknowledgement are verified.
- Post-publication edits remain in milestone 6; this addition covers editing before approval only.

## Milestone 5 approach

- Approved by the user on 2026-10-07. Post only the exact approved fictional square image to Test_group at the Secretary-selected time.
- Recheck saved approval, image hash, paired identity, and live group name immediately before sending. Persist the attempt before sending, wait for WhatsApp acknowledgement, and refuse duplicate or uncertain retries.
- The laptop runner can wait with --watch; the laptop must remain awake and connected. The user authorized an immediate test post, with the original selected time retained in the private audit record.
- Posted the exact approved square image to Test_group. Fixed group acknowledgement handling to use participant delivery receipts, recovered the existing receipt without resending, and verified delivery. All 75 tests pass; rerunning sends no duplicate. The user confirmed seeing the image in Test_group on the phone; milestone 5 is complete.

## Milestone 5 private posting confirmation

- User confirmed the repeat posting check on the phone, then requested a private success message asking the Secretary to check for needed edits.
- Send the private review request only after verified group delivery. Save its receipt and wait for acknowledgement; completed reruns send neither another board nor another confirmation.
- All 79 tests pass. The private confirmation was acknowledged in Secretary self-chat without another group image. The user confirmed the private message on the phone; handling post-publication corrections is now approved for milestone 6.

## Milestone 6 approach

- User approved private EDIT after posting. Reuse batch corrections and invalid-line retries, show a new preview, and require APPROVE before immediately posting the corrected image to Test_group.
- CANCEL restores the original posted board and receipt. Old preview approvals and duplicate commands cannot post a correction. Group delivery and private confirmation are acknowledged separately.
- Keep the original group post while a correction is pending. Save all state privately; only fictional test data and the authorized Secretary self-chat are used. Live phone verification is pending.
- Fixed the reported Listner spelling: it maps to the existing Listener slot. Explicit assignment sentences also work; uncertain wording is rejected. All 87 tests pass. Replayed the user’s exact fictional Timer/Listener batch into one private preview, visually verified both Noel Example assignments, and received WhatsApp acknowledgement. Corrected group delivery still awaits APPROVE from the phone.

## One person per role correction

- User clarified that one person must not hold multiple roles. Corrections now check the completed board, quote conflicting lines with the other held roles, retain unrelated valid lines, and create no preview until conflicts are resolved.
- Moving a holder works when their previous role is reopened in the same batch. Names are compared without case or spacing differences. Approval and final group posting both reject a duplicate-holder board saved by an older version.
- All 93 tests pass. Replayed Timer: Noel Example; Listner: Noel Example and verified both lines were rejected privately because Noel already holds TMOD. No new preview or group image was sent. The private retry prompt was acknowledged; fresh corrected-preview approval still awaits the phone check.

## Removing a speaker slot

- User requested removal rather than showing an open slot, and explicitly chose to hide the paired evaluator too. Speaker 2: Remove hides both slots from the table and image; assigning the next numbered speaker adds a new pair with its evaluator open.
- Group chatter cannot reactivate removed slots. Removing all speakers hides that section; remaining speaker/evaluator pairs are renumbered consecutively. Cancel and fresh approval use the same private edit flow.
- All 99 tests pass. Visually checked a fictional square board with Speaker 2 and Evaluator 2 absent. Reloaded the private listener and delivered removal instructions; live removal preview and corrected group delivery await the phone check.

## Consecutive speaker and evaluator numbers

- User requested consecutive numbering after a removal. Surviving pairs keep their holders together and shift up, so removing Speaker 2 moves the old Speaker 3 and Evaluator 3 to number 2.
- Images explicitly show evaluator numbers; the text table and later corrections use the same numbering. Batched removals refer to the starting preview; a later new speaker is appended using the next number.
- All 102 tests pass. Visually checked the renumbered fictional draft and refreshed its private preview; fresh phone approval is still required before group posting.

## Duplicate preview correction

- User reported two previews. The numbering update was manually refreshed twice, once for speakers and once for explicit evaluator labels; combine related changes before sending future previews.
- The private edit runner now saves preview delivery by image checksum, reuses acknowledged receipts for the same image, and checks uncertain receipts without automatically resending.
- All 108 tests pass. Live restart check queued two identical current previews and verified both were cleared using the existing acknowledged receipt, with zero new WhatsApp messages. Fresh corrected-board approval still awaits the phone.

## Private table view

- User requested a table option for checking and editing the board before viewing an image preview. TABLE shows the current renumbered board privately; EDIT opens corrections and returns one image preview. APPROVE remains required before group posting.
- Table requests preserve approval, pending invalid lines, removed slots, and the group receipt; duplicate command events are ignored. No image is sent for a table request.
- All 110 tests pass. Sent the current fictional table and TABLE / EDIT instructions privately; WhatsApp acknowledgement verified. Phone correction and final approval checks remain pending.

## Milestone 6 final confirmation

- User confirmed the full milestone repeat on the phone. Verified a fresh acknowledged preview, a new Test_group post matching the exact approved image, group delivery receipt, acknowledged private success message, and no pending replies.
- Private TABLE works; corrections support multiple lines, invalid-line retries, one role per person, removing paired speaker/evaluator slots, consecutive numbering, and CANCEL. Approval is required before corrected group posting.
- All 110 tests pass. Milestone 6 is complete; close/reopen verification is milestone 7. The laptop helper must remain awake and connected; no static frontend exists to deploy.

## Milestone 7 restart verification

- User requested the next milestone. Closed the active helper, saved a private restart snapshot and reopened it in a new process.
- Verified saved role holders, meeting details, removals, consecutive numbering, image checksum, approval and delivery records. Existing group post and private success receipt were reused; no group image was resent.
- All 113 tests pass. WhatsApp acknowledged the private restored-board table and TABLE / EDIT options. Repeated the restart check and the user confirmed the restored roles and names on the phone; milestone 7 is complete.

## Parked list

- Product information landing page, requested after the separate helper is connected and verified in Test_group. Explain the WhatsApp flow and how to start; retain the zero additional spending requirement. Build only after the group milestone is confirmed.

- Real Secretary launch: one separate helper WhatsApp number, shared across clubs with private board/schedule separation; begin with one real Secretary and club. The user has a spare number, does not have a business account, and requires no additional spending. Oracle Free Tier signup and card verification are accepted. First finish hosted Test_group verification, then define and build Secretary onboarding before authorizing any real-group messages.

- Usual meeting schedule implementation: after reminder day/time and meeting day, ask for the usual meeting time (24-hour or AM/PM, India time). Persist it privately; START sets each fresh board's date from the usual weekday and its time from the usual time. One-off EDIT changes do not replace those defaults. All 143 tests pass. The user saved Sunday 4:30 PM and confirmed the fresh weekly preview auto-filled 11 October at 4:30 PM. Exact preview acknowledged in WhatsApp; no test group post. Restored the previous posted board after the preview test, retaining the saved usual schedule.

- Withdrawal/reassignment verified through live phone messages: Lena Example withdrew from Listener, which reopened; Noah Example then took it. Speaker 1, Evaluator 1 and Timer were preserved. Next approved change: meeting-day cycle and unchanged-board guard, with the final automatic update at 20:00 the day before the meeting.
- Meeting-cycle implementation: first setup asks reminder day/time, then meeting day. New drafts use the next selected meeting day after the reminder; the current board retains its explicitly displayed date unless the Secretary edits it. Daily updates support all seven days through the displayed meeting date's previous-day 20:00 cutoff. Unchanged-role comparison against the last published board blocks a repost, including withdrawal/reclaim sequences that cancel out. Approval of an identical Secretary edit keeps the existing group receipt rather than posting again.
- All 141 tests pass. The user selected Sunday, changed the current board to 11 October through private EDIT, approved it, and confirmed the delivered date and Noah Example as Listener on the phone. Verified all four assignments, exact image, group delivery and private acknowledgement. Live cutoff is Saturday 10 October at 20:00 India time; the production scheduling decision returned unchanged for an evening probe on this exact posted board. All seven weekday calculations, weekend updates, invalid dates, cancelled-out changes and identical-edit approval have automated coverage. A natural 20:00 unchanged-day observation was not run.

- Weekly reminder flow approved: first ask for day and time in India time, remind privately each week, and send one catch-up reminder when reopened after missing the time. Start fresh with open roles; the Secretary adds speakers and reviews and approves before group posting. Always-on server work is deferred at the user's request.
- Implementation: `npm start` runs the laptop weekly helper. Setup and reminders use persistent private state and acknowledged messages. START opens a fresh weekly draft while preserving the previous posted board; CANCEL restores it. Approval and selected-time posting share the existing image and delivery checks. All 126 tests pass. The user saved Monday 19:00 India time, authorized a private reminder test without changing that schedule, opened a fresh board and assigned Speaker 1, Evaluator 1 and Timer. Fresh preview, approval and time confirmation verified; the user then authorized immediate delivery and confirmed all three assignments on the Test_group image. Exact approved image and private success acknowledgement verified; restart retained the weekly schedule and sent no duplicate board. Natural future-time posting and a real laptop-off reminder catch-up were not exercised in this repeat; timing and missed-week behavior have automated coverage.
- Reporting correction: inspect every visible role, list all filled roles, and verify the group image against the exact approved board. The earlier speaker-only report omitted Evaluator 1 and Timer; all three assignments were already correctly saved and posted.

## EDIT table confirmation

## Short scheduled-post verification

## Live role updates (confirmed bounded test)

- Read fresh text only from Test_group after the first approved board is delivered. Paired-phone messages can simulate fictional members using `Lena Example: I'll take Listener`; other participants use stable fictional aliases in this bounded test. Ignore helper echoes, unrelated chatter and duplicate events.
- Save at most 300 pending messages privately, interpret ten at a time through the existing capped Hermes call, and protect holders, one-person-per-role, withdrawals and removed slots. Availability questions remain internal; unclear replies and retry notices go only to Secretary self-chat.
- Pending role changes appear in private TABLE/EDIT. Aggregate changed-board images for 20:00 India time Monday through Friday; changes after that time wait for the next weekday, and this board freezes after Friday's cutoff. Hold automatic sending while Secretary edits or approval is pending. Persist sends and receipts to avoid duplicate or uncertain retries.
- All 134 tests pass. Live phone claim assigned Listener to Lena Example; Noah Example's competing claim preserved Lena, and an unclear reply produced a private Secretary clarification confirmed on the phone. Restart retained pending changes. User authorized a two-minute automatic delivery test: one changed-board image began sending three seconds after the test time, with no early send. Exact image, four assignments (Speaker 1, Evaluator 1, Timer, Listener), group receipt and private success acknowledgement verified and confirmed on the phone. Monday reminder is unchanged; future normal updates remain at 20:00 India time. Always-on hosting remains deferred.

- User confirmed the short scheduled post on the phone. Observed no early group send; send began five seconds after the selected time. Exact approved image, group delivery and private confirmation acknowledged. Monday reminder remained unchanged; receipt is stored privately outside the repository.
- The gap found after the short scheduled-post check is now connected and verified under milestone 9: the running weekly helper interprets fresh Test_group member messages and schedules changed-board images. Earlier milestone 2 runners remain separate bounded transcript checks.

- EDIT now shows the latest roles table in the same private reply as correction instructions, before and after posting. It preserves the board and existing group delivery record and sends no image until corrections are entered.
- All 118 tests pass. The user confirmed the table appears after EDIT in WhatsApp self-chat.
- Fresh meeting repeat confirmed: renewed approval, authorized immediate Test_group post, private EDIT table, correction preview and immediate posting after APPROVE. Exact corrected image, group delivery and private success acknowledgement verified; no pending replies.

## Milestone 13 — private Secretary setup (confirmed)

- Separate spare helper account on the server, with the existing Test_group runner preserved.
- Pilot permits only the paired personal Secretary account, using fictional names. Prefilled roles → acknowledged sample → club and meeting settings → reminder and posting times → final private approval.
- Persist draft and delivery records outside the repository; no group connection or posting in this milestone. No AI calls or new paid services for setup.
- User completed the private WhatsApp walkthrough and approved the final image. All 157 local tests pass; seven setup checks pass on the server. Restart preserved the complete setup exactly and sent no duplicate replies. Valid entries survive corrections; “Nothing to correct” approves the delivered preview without losing role holders. Group connection remains the next milestone.

## Milestone 14 — connect the separate helper to Test_group (confirmed)

- Secretary adds the spare helper account to the existing Test_group. Verify the exact privately configured group, helper membership and Secretary membership.
- Bind the completed private setup to this test group, show a private confirmation, and deliver the exact approved fictional board once in a phone-verified test.
- Preserve private schedules and role holders; prevent duplicate or uncertain sends across restart. Keep the original test-account runner from posting a competing board during the spare-helper test.
- Real club groups and general multi-club launch remain outside this milestone. Landing page follows its confirmation.

- Connection implementation: exact private Test_group ID and both memberships verified on WhatsApp. Private connection confirmation acknowledged; no group post yet. Old test-account service paused and disabled at boot during the spare-helper pilot to prevent a competing scheduled board; original board and schedule retained privately. All 160 tests pass. Phone command POST TEST BOARD, exact group image check and restart verification remain required.

- User confirmed the spare helper posted the approved board in Test_group. Exact image and every visible role verified; restart preserved the connection, schedules and posted record without duplicate sends. Fixed group receipts being filtered out. First delivery is recorded honestly as phone-confirmed (the original server receipt was missed). All 161 local tests and four hosted group-connection checks pass. Landing page is next; live member updates for the separate account remain future work.

## Missing-helper and replacement test-group check (confirmed)

- Missing helper blocks connection and posting, including after an earlier successful post; private instructions explain how to add the number and reconnect. Board, approval, schedules and prior delivery remain saved.
- User created a replacement test group. Verified the helper-absent case live, then both memberships after adding the helper. The user authorized the new group post privately and confirmed it on the phone; exact approved image, WhatsApp acknowledgement, every role and private confirmation verified.
- Group lookup ignores capitalization while binding the exact resolved name and ID privately. Earlier group receipt is archived privately; repeat sends are blocked. Restart preserved all state without sending duplicates. All 165 local tests and eight hosted connection checks pass. Landing-page planning remains next.

## Milestone 15 — product information landing page (confirmed)

- One public information page for Toastmasters Secretaries, matching DESIGN.md: Inter, cream/pink/blue surfaces, clear navigation and dark footer. Main action: See how it works.
- Show a fictional interactive WhatsApp example, explain private review and group posting, and disclose pilot availability. No login, signup form, public helper phone number, payment or chat data.
- Build only public web assets, host on the existing Convex site, and verify desktop/mobile behavior in the browser. WhatsApp services remain separate.

- Landing page implemented and published to the existing production Convex site for review. Desktop and mobile Chrome checks verify the example controls, primary link, FAQ, assets, no horizontal overflow and no browser errors. Public build copies six explicitly approved assets; all 166 tests pass. User reviewed the live page and requested no changes; milestone confirmed.

## Milestone 16 — member replies on the spare helper (confirmed)

- Read fresh replies only in the privately verified test group after a confirmed approved-board post. Reuse the existing capped subscription-only Hermes interpreter and role rules. Protect holders, enforce one role per person, handle withdrawals, and send ambiguity/retry notices only privately.
- Keep current roles in private TABLE; send only changed-board images at 20:00 India time through the day before the displayed meeting. Persist inbox, decisions, scheduled sends and receipts; block uncertain repeats.
- User authorized one two-minute changed-board phone test, then return to normal scheduling. All members and messages in this pilot remain fictional; no real-club launch or broader access.

- Phone test confirmed: a fresh fictional group claim assigned Grammarian through the hosted Hermes interpreter. No early post; one updated image was delivered after the authorized two-minute time, with exact image hash and WhatsApp server acknowledgement. All four filled roles and 11 open roles verified; private success acknowledged. Short-test permission consumed; normal changed-board timing restored to 20:00 India time. Restart retained roles, inbox decisions and delivery records without another image. All 170 tests and four hosted member-flow checks pass. Holder protection, withdrawals, one-role limits, clarification privacy, freshness, uncertainty and normal scheduling have automated coverage; those additional live phone scenarios remain optional follow-up checks.

## Spare-helper correction options (phone-confirmed; corrected delivery verified)

- EDIT now opens the latest roles table, including pending member updates, instead of the stale onboarding response. Corrections generate a fresh approval-bound image. Reopening EDIT preserves the draft.
- TABLE shows the draft text table and matching image preview. APPROVE, EDIT, TABLE and CANCEL are offered; the user confirmed both private deliveries. All 175 local tests and five hosted correction checks pass.
- Member interpretation and automatic posting pause during corrections. An approved correction is protected against duplicate/uncertain sends and preserves queued member messages. Live approval and corrected-group delivery now verified: both image and private confirmation acknowledged, all five filled roles and ten open roles checked against the exact approved image. The user has confirmed the private options; a separate group-image phone confirmation has not been requested.

## Milestone 17 — multiple Secretaries and clubs (phone-confirmed)

- One shared spare helper account; one club per Secretary. Separate private identities, boards, drafts, approvals, receipts, inboxes and schedules for every club.
- Reuse the current Oracle server and subscription-only Hermes limits across all clubs; no additional paid service. Keep real identities and messages outside the repository.
- Preserve the existing Secretary and exact connected test group through migration. New Secretaries start privately with START or give me the role board; all live boards remain fictional during verification.
- A Secretary chooses their test group privately by name after setup. Verify both memberships, reject ambiguous names, and prevent two Secretaries binding the same group.
- Test routing, cross-club approval protection, simultaneous role replies, restart, uncertain sends and independent delivery failures. Verify the complete flow with two Secretary accounts in two test WhatsApp groups before marking complete.
- Pilot website joining flow stays parked until this milestone passes.

- Implementation deployed to the existing Oracle helper service: private versioned club store, legacy state migrated unchanged, per-Secretary command contexts, ownership-checked group selection, isolated member inboxes and scheduled deliveries. All 188 local tests and 11 hosted multi-club checks pass. Service restart succeeded; original board and schedule retained exactly with no duplicate. Awaiting second-account live START/setup and two-group phone verification; not complete.

- Live second-account setup and connection completed: separate private previews and approvals, distinct verified group, approved image server acknowledgement and later Timer claim processed only in the second club. Original club record unchanged; both posted images match exact approved hashes. Current second board has Speaker 1 and Timer filled, 13 open; its changed-board image is pending normal 20:00 India time. Restart retained both records exactly without duplicate sends. Awaiting phone confirmation of the second private TABLE before saving the milestone checkpoint.

- User confirmed the second-account private TABLE. Its send was acknowledged; all 15 roles checked in each club, original record unchanged, and both pending updates remain scheduled for 20:00 India time. Multi-club setup, distinct approved group posts, member interpretation, private routing and restart are verified. The first normal scheduled updates for both clubs have not yet run; two-club scheduled delivery and repeat prevention pass automated tests.

## Club-specific changed-board times (approved correction)

- User confirmed that changed-board updates should follow each club's saved posting time. The original club stays at 20:00 India time; the second uses 20:10. Final update cutoff follows that same time on the day before each club's meeting.
- Corrected the scheduling calculation, private setup summary, correction cutoff and safe rebasing of pending updates. Preserve short-test authorization, board ownership, posted receipts and uncertain send intents. All 191 local tests and 16 hosted member/club checks pass. Live restart verified pending times 20:00 and 20:10, both boards and all group receipts unchanged, no paused clubs or new sends. Actual scheduled delivery remains pending its due time.

## Milestone 18 — landing page to test-pilot WhatsApp (phone-confirmed)

- Join the pilot opens the existing shared helper number with START ready for the visitor to send. No new WhatsApp number is required.
- Keep the helper number out of committed source and tests; insert the intentionally public contact link into ignored build output from private configuration.
- Explain that joining currently starts a test pilot with fictional names; real-club onboarding remains parked.
- Reuse an existing Secretary account for the live link check. START must preserve its saved club and lead to TABLE or EDIT; creation of new records is already verified in milestone 17.
- Verify live mobile/desktop link destinations and the resulting phone reply, then save and publish the checkpoint.

- Test-pilot link published and checked in live mobile/desktop Chrome: Join the pilot opens the privately configured paired helper with START ready, existing navigation and FAQ work, no layout or browser errors. Existing-account START preserves its club in regression checks. Contact number is inserted only into ignored build output; no real number is committed. Awaiting phone tap/send and helper reply confirmation; real-club restrictions remain active.

- User confirmed landing-page → WhatsApp → START → helper reply on the phone. Private reply acknowledged; both existing club records and approved group posts preserved, no new club created, schedules remain 20:00 and 20:10 India time. All 192 tests pass. Test-pilot connection is confirmed; real-club onboarding remains the next parked scope.

## Milestone 19 — real-club onboarding and clearer WhatsApp chats (venue phone-confirmed)

- Approved flow: welcome and prefilled roles → sample preview → first-time club settings → final approval → verified group connection → explicit first-post confirmation → member updates at each club's saved time.
- Ask Venue once in first setup, save it on the meeting, render it on the board, reuse it on future boards and allow Venue edits with a fresh approval. Preserve existing boards and accounts while introducing the new chat flow.
- Accept normal club and member names; real group members are tracked by WhatsApp account. Protect prefilled/unverified holders and ask privately if identity or intent is unclear; no public member replies or conflict notices.
- Short contextual replies; consistent APPROVE / EDIT / TABLE / CANCEL previews, HELP and returning-Secretary status. Cancellation pauses setup safely; START resumes without resetting saved data. Keep old test commands compatible while exposing CONNECT GROUP and POST BOARD.
- Preserve the existing server, capped subscription-only AI and private storage. Validate every new behavior with fictional data and in the existing test groups; do not put real names, numbers or chats in the repository.
- Latest user steering: explain the already-working role-reply update flow in onboarding and on the landing page; replace its outdated future-feature wording.

- Implemented and activated pilot chat flow, normal-name setup, one-time Venue, board rendering and approval-bound venue corrections, contextual HELP and setup pause/resume, CONNECT GROUP / POST BOARD with legacy aliases, account-bound real role claims and private identity clarification. Preserved both existing boards, meeting details, approved receipts and 20:00/20:10 schedules; reminders now queue privately from their saved times. All 203 local tests and 18 hosted checks pass. Hosted subscription-only AI interpreted a normal-name fictional pilot claim. Landing page now explains working member updates and saved venues; live browser checks pass. User confirmed the existing-account venue preview and approved it: second group received the exact approved image with Cedar Hall, Speaker 1 and Timer filled and 13 roles open; first club remained unchanged. First-time pilot setup and contextual HELP have automated coverage, not a fresh-account phone walkthrough.
