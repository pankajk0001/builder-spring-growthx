# Owner admin panel — approved V1 scope

Approved on 2026-10-11. This is a web interface for the product owner; the Secretary and member product remains in WhatsApp. Owner access, overview and activity tracking are live and user-confirmed. Pause/resume is live and user-confirmed; reset/restore and handover remain later milestones.

## Purpose and access

The owner can see who uses the helper, investigate accounts needing attention, and safely manage a club without using server commands. Only the owner may enter, using Google sign-in restricted to the configured owner account. Request only identity/email permissions; no Gmail, Drive or contacts access. Store the owner identity and credentials in private configuration, never committed files. Verify access on every server request, including board images, backups and analytics; hiding buttons is insufficient.

Show boards, settings and structured activity records, not full WhatsApp conversations. Public landing-page visitors must never receive account data. The existing helper server remains the authority for WhatsApp state and actions; the browser must never write the registry directly. Serialize admin actions with incoming messages, timers and sends. Preserve the existing AI limits.

## Overview and account details

- Counts: current Secretaries, connected clubs, setup incomplete, paused accounts and accounts needing attention.
- Active Secretaries: distinct current Secretaries who sent a verified private message to the helper in the previous seven days. Keep club activity separate: recent role replies and board events must not make a Secretary count as active.
- Searchable account list: club, current Secretary, setup/status, last Secretary activity, posting time and next pending update.
- Detail view: approved board, current member-updated board, unapproved draft, meeting settings, connection status and delivery history. Label these separately so an unapproved draft cannot appear to be published.
- Usage: Secretary activity, club activity, boards approved/posted, role updates, setup completion and failed deliveries. Start event tracking when installed; show unavailable historical values as unavailable, not zero. Derive older values only when existing records support them reliably.
- Health: WhatsApp connection, last successful service check, delayed or failed work, shared AI calls and remaining configured limits. Identify stale status instead of presenting it as current. Do not claim precise per-Secretary costs from the existing shared ledger.
- History: owner action, affected club, time and result for pause/resume, reset, restore and transfer. No credentials or raw conversation text in history.

## Pause and resume

Pause stops both automatic posting and processing role replies for the selected club. Preserve saved state; other clubs continue. Do not replay role replies received during the pause automatically on resume. Resume does not bypass reset/restore approval requirements, unresolved delivery errors or uncertain sends.

## Reset and restore

Reset is a deliberate confirmed action on one selected account:

1. Save and verify a private recoverable backup before changing the account. If backup fails, do not reset.
2. Stop automatic posting and role-reply processing. Clear executable pending work for the old setup while preserving it in the backup; do not let old queues or receipts cause sends in the new setup.
3. Restart setup without automatically messaging the Secretary. The Secretary sends START themselves. Permit this recovery command even though automatic account activity is paused.
4. Require the full fresh preview/approval flow and verified group ownership before automatic work resumes. Never treat an old approval as approval of the new setup.

Restore backup recovers saved board and settings, but keeps automatic work paused. The Secretary must review a newly delivered preview and approve before posting resumes. Recheck current account/group ownership and uncertain send records; restoring cannot replay historical posts or regrant access to a replaced Secretary. If a send is already in progress or uncertain, block reset/restore until its result is established.

## Secretary handover

Keep a permanent club record whose current Secretary can change. Preserve club/group ownership, approved board, member assignments, venue, schedules and activity history. A change of Secretary is not a reset.

The owner may initiate a transfer. The current verified Secretary may also request a transfer privately, identifying the incoming Secretary. Every Secretary-requested transfer requires owner approval.

Flow: current Secretary requests → owner approves → incoming Secretary sends START and confirms the named club handover privately → access transfers. For owner-initiated transfers, start at owner approval. Pending transfer acceptance must be checked before ordinary START creates a new club account.

The current Secretary keeps management access until completion. During a pending handover, automatic work continues from the approved board unless the club is otherwise paused. Confirm incoming WhatsApp identity and group membership; reject an identity already managing another club under the existing one-club-per-Secretary rule. Cancelled or stale requests cannot transfer control; allow the owner to cancel pending requests. Expire old confirmation links/requests using a bounded lifetime chosen during implementation.

Complete the ownership change as one operation: move private reminders, approvals and management access to the incoming identity; revoke the outgoing Secretary's management access; archive unfinished drafts; invalidate old pending questions and approval commands. Preserve approved-board/group receipts and member work. Do not change the public group with handover notices. Record the result in admin history. The incoming Secretary reviews the current board before changing it; the existing approved board can continue posting without being reapproved solely because of handover.

## V1 exclusions

No additional admin accounts or permission levels, billing, payments, full conversation viewer, advanced reports, bulk resets, or automatic six-month handovers. Historical analytics are not fabricated. No admin action bypasses holder protection, ownership checks or approval-bound image delivery.

## Verification

Test owner login and rejected non-owner access, including direct requests for account data and actions. Walk the actual admin web interface in a browser; verify all WhatsApp effects in authorized test groups with made-up test identities/names. Test wrong account selection, duplicate clicks, stale state, backup/storage failures, AI failures, concurrent sends, restart, reset recovery, restored approvals and wrong-person transfer acceptance. Check every visible board role and the exact delivered image. User continues manual WhatsApp testing except when explicitly requesting an immediate test send.

## Existing work still open

Immediate private reminder and group posting with an open draft are phone-confirmed. The normal one-hour-before-posting reminder timing still needs its scheduled check; admin planning must not mark that verified.
