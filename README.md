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

On a phone using mobile data, open Test_group and find `the helper — MADE-UP TEST` followed by `the helper — UPDATED TEST BOARD`. The expected assignments are Timer: Mira Example, Grammarian: Noel Example, Ah Counter: Iris Example, and Listener: Open. The group note preserves the filled Timer role. In self-chat, find `the helper — PRIVATE TEST CLARIFICATION`, which quotes Lena Example's unclear made-up reply and asks the Secretary for help.

## Limits and local state

The runner accepts fictional data only, limits input to 300 messages, requests a maximum of 500 output tokens, disables request retries, and records at most 100 requests per rolling hour in a locked laptop file. Its $5 local guard reserves a conservative API-equivalent estimate; Codex subscription allowance is controlled by the signed-in account, rather than an API billing limit.

Hermes sign-in credentials, WhatsApp session files, the group ID, usage ledger, and delivery receipt stay outside this repository under `~/.hermes/`. Never copy them into git.

Milestone 1 was posted and checked through WhatsApp, and the user confirmed the table and private clarification on a phone. The code is saved in the GitHub repository `pankajk0001/builder-spring-growthx`. This milestone runs through Hermes on the laptop; it has no static frontend to deploy.
