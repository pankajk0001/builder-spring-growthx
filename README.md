# the helper

Milestone 1 is a laptop-run WhatsApp test for updating a Toastmasters role board from fictional messages. It uses the installed Hermes runtime and its saved OpenAI Codex sign-in with `gpt-6.1-sol`.

## Check the code

```sh
npm ci
npm test
```

The tests use made-up names and messages only. The Hermes launcher check runs when Hermes is installed; call-limit tests also require Python 3.

## Run the WhatsApp test

Pair WhatsApp through `~/.local/bin/hermes whatsapp`. The paired account must belong to a group named exactly `Test_group`.

```sh
node scripts/find-test-group.mjs
npm run test:whatsapp
```

The lookup reads group names and IDs, never other groups' messages. It saves only the Test_group destination under `~/.hermes/the-helper/`, outside this repository.

The runner checks the group's name before every group send. It posts a fictional current board and six fictional messages, reads its own posted source from the WhatsApp event stream, sends that source to Hermes for interpretation, and posts the verified updated table. Unclear-reply questions go privately to the Secretary's authorized test inbox: the paired account's self-chat. Private sends are checked through WhatsApp send receipts and a phone check; they do not require a group-stream echo. It does not generate a board image or start automatic replies. Re-running after a completed test does not send duplicates.

On a phone using mobile data, open Test_group and find `the helper — MADE-UP TEST` followed by the updated table. The expected assignments are Timer: Mira Example, Grammarian: Zara Example, Ah Counter: Iris Example, and Listener: Open. The table preserves the filled Timer role without a group reply. In self-chat, find `the helper — PRIVATE TEST CLARIFICATION`, which quotes Lena Example's unclear made-up reply and asks the Secretary for help.

## Check role availability (milestone 2)

Run `npm run test:whatsapp:roles` to post six fictional role messages in Test_group, interpret them through Hermes, and update the current board silently. Availability questions do not claim a role; explicit claims and bare role names fill open roles. A filled role keeps its existing holder, including when another person asks for it. Requests are processed in order.

On your phone, find only the final table after the fictional source: Timer belongs to Mira Example, Listener belongs to Iris Example, and Grammarian stays open. There must be no individual role replies or public conflict notes. The unclear “that one” message goes privately to the Secretary's self-chat. All examples are fictional.

This is a bounded test run, not an always-on listener. Completed runs do not send duplicate messages, and intermediate receipts let a retry resume after confirmed sends.

Run `node scripts/run-milestone-2.mjs --mixed-chatter` for a separate fictional conversation mixing five everyday messages with six role-related messages. The live AI check must ignore all five everyday messages, including unrelated uses of “timer” and “listener,” while producing only the final board in the group. This uses realistic invented chatter, not real club conversations.

Run `node scripts/run-milestone-2.mjs --long-chatter` for exactly 60 invented messages: 48 everyday messages and 12 role-related messages, including conflicts and withdrawals. The runner posts the source conversation in Test_group, reads it back, then interprets six batches of ten through Hermes. Each batch sees the board updated by preceding batches and uses the same rate, budget, and 500-output-token limits. Saved interpretation batches let retries resume without repeating completed calls.

The expected final board is Timer: Mira Example, Listener: Lena Example, Grammarian: Iris Example. There should be no individual group replies: only the updated table after the test source, and one unclear-message clarification only in Secretary self-chat. The live check records every group send and rejects any extra output or duplicate table. Separate table-only receipts allow this corrected test to run without changing earlier test receipts.

## Preview the role-board image (milestone 3)

Run `npm run test:whatsapp:image` to create a fictional board PNG and send it with its source table to the paired Secretary self-chat. It sends nothing to a group. On your phone using mobile data, find `the helper — SQUARE BOARD PREVIEW` and compare all names in the image to the source-table caption, especially the three speaker/evaluator pairings and Open roles.

The renderer draws text directly from the board data, using bundled Inter rather than AI image generation. It follows the local reference's blue sections, red table rows, role order, and closing message. Long names wrap and rows grow as needed. Unknown or missing layout roles fail rather than disappear. The test uses a fictional club badge, meeting, and members; the real reference file is ignored by git.

The PNG and delivery receipt stay under `~/.hermes/the-helper/`. The image is square, with a complete-board thumbnail and explicit image dimensions sent to WhatsApp. The runner checks the returned image checksum, caption, thumbnail, dimensions, and self-chat destination, and skips a completed identical preview. Download the latest image and check whether the whole board is visible directly in chat without opening the gallery. Scheduled approval and group image posting are later milestones.

The Inter font is from the official [Inter repository](https://github.com/rsms/inter), distributed under the bundled SIL Open Font License in `assets/fonts/Inter-LICENSE.txt`.

## Approve a board and choose its time (milestone 4)

Run `npm run test:whatsapp:approval` after confirming the current square image on the phone. The helper sends that exact fictional preview to Secretary self-chat, then waits for real phone replies:

1. Reply `APPROVE` after checking the image, `EDIT` to correct it, or `CANCEL`.
2. Enter a future date and 24-hour time such as `2026-10-08 20:00`, interpreted in India time (IST). The helper shows an example based on the current date.
3. Check the displayed full date, time and Test_group destination, then reply `CONFIRM` to save approval.

Before approval, reply `EDIT` and send one or several corrections in one message, one per line (semicolons also work), such as `Timer: Zara Example`, `Timer: Open`, `Evaluator 2: Finn Example`, `Meeting number: 43`, `Meeting date: 2026-10-18`, or `Meeting time: 15:45`. Club names can also be corrected using `Club: MADE UP EXAMPLE CLUB`. The live test accepts only made-up participant names ending Example and club names containing Example. The whole message is validated before any changes are applied. Invalid corrections are quoted with their reason. Valid corrections are kept privately while the Secretary resends only the bad lines, in the order listed. No changes reach the board until every correction is valid. Repeated conflicting fields require choosing one value. All valid corrections produce one new square preview; all earlier approval and posting times are cleared. Approve the latest preview and choose a new time. This also works before final confirmation. Post-publication editing remains a later milestone.

Run `node scripts/run-milestone-4.mjs --edit-check` to archive the prior local test request and begin a fresh approval/edit check. Normal reruns resume the existing board, including edits, without resetting to the original fixture.

Approval is bound to the exact image. Changed boards, old messages, other people, group messages, duplicate events, invalid dates and past times cannot approve it. Replies wait for a WhatsApp acknowledgement before being marked sent or closing the connection, so the final confirmation is not abandoned on shutdown. Fresh delayed self-chat events and linked-device addresses are accepted, while messages older than the active request are ignored. These steps make no AI calls. Approval state, message IDs and pending private replies stay outside git in `~/.hermes/the-helper/approval-state.json`; real chat text is not logged. The test listener stops on confirmation or cancellation, or pauses after 15 minutes; rerun to resume the saved request without duplicating the preview. Completed requests do not send duplicate prompts.

This milestone saves the approval and selected time. It sends nothing to any group and does not schedule delivery yet; group posting is milestone 5.

## Limits and local state

The runner accepts fictional data only, limits input to 300 messages, requests a maximum of 500 output tokens, disables request retries, and records at most 100 requests per rolling hour in a locked laptop file. Its $5 local guard reserves a conservative API-equivalent estimate; Codex subscription allowance is controlled by the signed-in account, rather than an API billing limit.

Hermes sign-in credentials, WhatsApp session files, the group ID, usage ledger, and delivery receipt stay outside this repository under `~/.hermes/`. Never copy them into git.

Milestone 1 was posted and checked through WhatsApp, and the user confirmed the table and private clarification on a phone. The code is saved in the GitHub repository `pankajk0001/builder-spring-growthx`. This milestone runs through Hermes on the laptop; it has no static frontend to deploy.

### Posting an approved board (milestone 5)

Run `npm run test:whatsapp:post` to post only when the approved time has arrived. Add `-- --watch` to wait on this laptop; it must stay awake and connected. The runner uses only Test_group and fictional data, sends the approved image once, and waits for WhatsApp acknowledgement. A saved uncertain attempt blocks automatic resends; when an image receipt exists, rerunning checks that existing receipt without sending another image. Use `-- --post-now-test` only after the Secretary explicitly chooses an immediate test post; the previous selected time is preserved in the private record. Credentials and posting records stay outside the repository.

After verified group delivery, the helper privately confirms the post to the Secretary and asks them to check for edits. The confirmation is saved and acknowledged separately; rerunning does not repeat either the board or the completed confirmation. Post-publication correction handling remains milestone 6.

### Editing a posted board (milestone 6)

Run `npm run test:whatsapp:edit` to listen in Secretary self-chat for 15 minutes; rerun to resume saved state. Reply EDIT, send corrections together, then check the corrected private preview. APPROVE posts that exact image immediately to Test_group and sends a private delivery confirmation. CANCEL restores the original published board. Invalid lines are quoted and valid lines retained for retry; no group image is sent while corrections are pending. The laptop must remain awake and connected.

Role corrections accept the common Listner spelling for Listener and explicit sentences such as “Timer is taken by Zara Example and Listener is taken by Finn Example.” Uncertain or negated assignments require clarification.

Each person can hold only one role. The helper checks all assignments after applying the proposed batch, so moving someone is allowed when their previous role is reopened in that same message. Conflicts are quoted privately with the other roles; no new preview or group post is created until corrected. Approval and posting also block old previews containing duplicate holders.

To remove a prepared-speaker slot, send `Speaker 2: Remove` while editing. Speaker 2 and Evaluator 2 disappear from the image and text table, rather than displaying Open. Group claims cannot restore removed slots. Assigning `Speaker 2: Zara Example` later restores the pair with an open Evaluator 2; the corrected preview still needs APPROVE before posting. Remaining slot numbers stay unchanged.
