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

## EDIT table confirmation

- EDIT now shows the latest roles table in the same private reply as correction instructions, before and after posting. It preserves the board and existing group delivery record and sends no image until corrections are entered.
- All 118 tests pass. The user confirmed the table appears after EDIT in WhatsApp self-chat.
