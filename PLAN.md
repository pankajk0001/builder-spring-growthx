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
- [ ] 4. Get the Secretary's approval to post the board at the time they select.
- [ ] 5. Post the board in the WhatsApp group.
- [ ] 6. Let the Secretary edit a role on the board.
- [ ] 7. Close and reopen the helper, and confirm the board is still there.

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

## Parked list
