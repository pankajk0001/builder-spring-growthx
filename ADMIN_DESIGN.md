# Owner overview surface

Mode: Operate. Extend the existing helper identity without changing the public landing page.

Inter, green text and controls on a pale neutral surface; white account details and blue owner-controls label. Use a 40px desktop / 32px mobile page heading, 16px body, and 14px table rows. Buttons have at least 44px height with visible blue keyboard focus. Approved, current and private draft views have distinct labels and explanatory text. No decorative charts or illustrative metrics.

Desktop: header with brand and sign-out, overview counts and timestamp, labelled search, account list beside settings/board details. Mobile: the same order in one column, with wrapping tabs and all role rows readable. Backend refreshes automatically; stale data is marked after three minutes. Loading, denied access, empty list/search and missing records have explicit messages.

Browser checks used fictional accounts at 1440px and 390px. Search and all board tabs worked, all 15 roles appeared, private draft names stayed out of the approved view, and no horizontal overflow or page errors were found. Local screenshots are outside the repository. Owner subsequently confirmed actual production Google sign-in and visible Secretary accounts. The fictional browser walkthrough covers every role; a real per-role panel walkthrough and separate non-owner Google login remain pending.

Existing DESIGN.md remains unchanged. The mechanical detector's Inter warning is intentionally retained because Inter is the existing specified project font.

Pause/Resume sits directly below the selected club's name, ahead of board settings. Its inline confirmation names that club and explains the effect; Cancel leaves it unchanged. The UI waits for the helper's saved confirmation instead of immediately changing its status. Stale/offline controls are disabled, blocked resumes explain the saved delivery/approval issue, and a collapsed owner-history list shows the last 20 actions with times and results. Account switching clears confirmation. Fictional desktop/mobile checks passed this flow and all board tabs; the user confirmed CHD TM pause/resume and the private draft matching its WhatsApp TABLE preview.
