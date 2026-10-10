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

After setup is complete, send START privately to prepare a fresh meeting draft. All visible roles start open, account ownership is cleared, the date uses the next usual meeting day, and a numeric meeting number advances once. Club, venue, meeting time, reminder, posting time and connected group stay saved. TABLE shows the draft and its preview; add pre-filled roles, then approve the latest delivered preview. The previous approved board remains in place until approval. CANCEL discards only the fresh draft. START with an existing draft keeps its edits and asks you to review or cancel it. After a new meeting is posted, old queued messages and send history stay archived privately and the new listening cycle starts fresh.

The shared hosted helper keeps confirmed member updates running while a Secretary correction draft is open. Only the approved board plus confirmed member changes can reach the scheduled group post; unchanged boards do not repeat. One hour before each saved daily posting time, an open draft gets one private reminder and matching preview, with APPROVE, EDIT and CANCEL. Reminders end with the approved meeting's posting cycle and survive restart without repeating.

Draft previews include newer changes to untouched roles. When both the draft and members changed a role, the helper asks the Secretary privately to reply KEEP CURRENT or USE DRAFT, one role at a time. It then sends a fresh preview which still needs APPROVE. Another conflicting member change requires a new choice. Unchecked member replies prevent immediate draft delivery until they have been processed. Approved corrections still post immediately. This behavior is implemented locally; live WhatsApp verification is pending.

Run `npm run test:whatsapp:edit` to listen in Secretary self-chat for 15 minutes; rerun to resume saved state. Reply EDIT, send corrections together, then check the corrected private preview. APPROVE posts that exact image immediately to Test_group and sends a private delivery confirmation. CANCEL restores the original published board. Invalid lines are quoted and valid lines retained for retry; no group image is sent while corrections are pending. The laptop must remain awake and connected.

Role corrections accept the common Listner spelling for Listener and explicit sentences such as “Timer is taken by Zara Example and Listener is taken by Finn Example.” Uncertain or negated assignments require clarification.

Each person can hold only one role. The helper checks all assignments after applying the proposed batch, so moving someone is allowed when their previous role is reopened in that same message. Conflicts are quoted privately with the other roles; no new preview or group post is created until corrected. Approval and posting also block old previews containing duplicate holders.

To remove a prepared-speaker slot, send `Speaker 2: Remove` while editing. Speaker 2 and Evaluator 2 disappear from the image and text table, rather than displaying Open. Group claims cannot restore removed slots. With two visible speakers, assigning `Speaker 3: Robin Example` adds a third pair with an open Evaluator 3; the corrected preview still needs APPROVE before posting. Remaining speaker/evaluator pairs are renumbered consecutively; later corrections use the numbers on the latest preview. Add the next numbered speaker slot to restore capacity.

The private edit runner records preview delivery by the exact image checksum. Duplicate queued previews and restart retries reuse the existing acknowledged preview; a changed image gets a new preview. If a send is uncertain and has no receipt, it stops rather than risking a duplicate.

Reply TABLE in Secretary self-chat to view the current role board as a text table. Reply EDIT, send corrections together, and check the resulting image preview. TABLE can also be used while correcting invalid lines; it keeps pending corrections and does not change approval or post an image.

### Closing and reopening (milestone 7)

Stop the active helper, then run `npm run test:whatsapp:restart` after a completed posting flow. It checks the saved board, role edits, removed slots, numbering, approval and delivery records, then privately sends the restored table. It does not repost the group board. The private edit listener remains available for 15 minutes; rerun `npm run test:whatsapp:edit` to resume it. Restart snapshots and receipts remain outside the repository.

### Weekly reminders

Run `npm start` for the weekly laptop helper. It asks one question at a time: reminder day and 24-hour India time (such as `Monday 19:00`), usual meeting day (any day), then usual meeting time (such as `14:30` or `2:30 PM`). New drafts automatically use the next occurrence of that meeting day after the reminder and the saved usual time. One-off date/time edits do not replace the usual schedule. A reminder on the meeting day prepares the following week's meeting; reminders on the previous day must be before 20:00. Keep the laptop awake and connected. The process keeps running until stopped; restarting preserves the schedule and sends one catch-up reminder for the latest missed week, rather than every missed week.

The private reminder asks for START. START opens a fresh board with all existing visible roles open; enter this week's speakers using made-up names ending in Example for the bounded test. Corrections return an image preview; APPROVE asks for the first posting date/time, and CONFIRM saves it. This runner waits and posts the exact approved image to Test_group at the selected time, then confirms privately. TABLE and EDIT remain available after posting. CANCEL restores the previous posted board. An unfinished draft is preserved when the next reminder arrives. Saved boards, schedule and receipts stay outside the repository. This is laptop operation; always-on hosting remains deferred.

### Live role replies

The weekly helper now listens to fresh Test_group text after the first approved image is delivered. On the paired phone, use fictional member messages such as `Lena Example: I'll take Listener`. The prefix is a test convenience for the paired account only; other participants cannot impersonate that fictional holder. Their account identifiers are converted to stable fictional aliases, without putting chats or account data in the repository.

Role changes are saved silently. TABLE privately shows current assignments. Holder conflicts and availability checks do not generate group replies; unclear messages go privately to the Secretary. Images post only if roles differ from the last posted board, at 20:00 India time on any day through the day before the displayed meeting date. Messages after 20:00 move to the next day if it is within that cycle; later messages do not change this meeting's automatic board. The current board keeps its displayed date when the weekly meeting-day preference is set; use EDIT to change its date with fresh approval. Pending Secretary edits pause interpretation and automatic posting. Input queues, interpreted batches and send receipts survive restart; calls reuse the existing laptop rate and budget controls. The laptop must stay awake and connected.

Approving a Secretary edit that renders the exact same image keeps the existing group post. Date, meeting details or role changes still require approval and post a changed image immediately. The scheduled automatic update compares against the last published roles and skips unchanged boards even when an earlier withdrawal was reversed before posting.

## Hosted Test_group pilot

`deploy/whatsapp-helper.service` runs the existing fictional Test_group helper on an Ubuntu server as `ubuntu`. It starts at boot, restarts after connection failures, and stops gracefully before restarting. The laptop copy must be stopped before moving or starting the same linked WhatsApp session on the server.

Runtime setup uses Node 24.14.0, the project and WhatsApp bridge lockfiles, and the same Hermes source revision as the laptop. Install Hermes dependencies with `uv sync --frozen --python 3.14 --no-dev`. The service sets `HELPER_HERMES_PYTHON` to Hermes's virtual environment and `PYTHONPATH` to its source folder. Keep only the selected subscription provider's credentials in the private server auth store; do not copy API keys, the general laptop environment, or real chat history. No paid API fallback or extra-credit purchase is configured.

Private data lives under `/home/ubuntu/.hermes/`, outside the repository: saved board and schedule in `the-helper/approval-state.json`, call/budget ledger in `the-helper/ai-limits.json`, group destination in `the-helper/test-group.json`, selected AI sign-in in `auth.json`, and linked WhatsApp credentials in `whatsapp/session/`. Set folders to mode 700 and credential/state files to mode 600. Remap `sessionPath` in the private destination file to the server path. Set `runnerHome` to `/home/ubuntu` in both destination files so the laptop's weekly runner stops before connecting. Never copy the laptop process lock to the server.

Before moving state, stop the laptop helper and keep a private backup. Run `node scripts/prepare-hosted-state.mjs PRIVATE_SOURCE PRIVATE_DESTINATION` locally. It preserves the exact reviewed PNG and its role positions for each saved board, checking that approvals and posting records are unchanged. Linux may otherwise render different PNG bytes from the Mac. An edit to a role, removed slot, or meeting detail requires a newly rendered preview; damaged preserved images block sending.

Install the service file into `/etc/systemd/system/whatsapp-helper.service`, run `sudo systemctl daemon-reload`, then `sudo systemctl enable --now whatsapp-helper`. Inspect it with `sudo systemctl status whatsapp-helper` and `sudo journalctl -u whatsapp-helper --since '5 minutes ago' --no-pager`. Restart with `sudo systemctl restart whatsapp-helper`. Keep the laptop copy stopped while the server owns the session; moving back requires stopping the server and copying the latest private state, ledger and credentials back first.

Acceptance: verify the complete restored board, the exact approved image, schedule and send receipts; prove an AI call with fictional inputs; check private TABLE from the phone; restart the server service without reposting the board; finally send TABLE on mobile data while the laptop is off. Always Free compute has availability limits and may be reclaimed if idle. The one-number setup for real Secretaries and separation between clubs are still subsequent milestones; this service remains restricted to Test_group and fictional names.

## Product information page

Public page: https://neat-hound-892.convex.site

`npm run build` builds only the public files from `web/` and the licensed Inter font into `dist/`. `npm run deploy` builds and publishes them to the existing Convex static-hosting component. No helper session, phone number, private state, or environment file is included. `npm start` remains the WhatsApp runner.

The page uses fictional examples and explains current pilot availability. It has no login, signup, analytics, payment, or connection to WhatsApp messages.

Secretary messages can contain several clear assignments, such as “set Speaker 1 to Ada Example and Timer to Mira Example”. The helper updates the private draft together, sends one summary and matching preview, and waits for approval. Occupied-role replacements need separate private confirmation.
