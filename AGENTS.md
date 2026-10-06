## 1. How the product works
Interface: [Whatsapp] and the one thing they do there: [generate a role-board]
Business logic: [When the role-baord is generated it get posted automatically and reads replies for filling the roles on the board so that it can update the role board before posting it again]
Database: [role-baord table with all the roles and an column if the the role is filled or not and the name of the role bearer to generate an image.]
Third party: [hermes for whatsapp messages as it reads and posts in the group, also reads the replis and works out who took which role and its key stored in my laptop, hermes calls gpt-6]
Not in v1: Asking for payment inside the product
- Login
- Sharing public speaking tips

When I report a bug, I'll name the part. Look there first, and tell me if you think I named the wrong one.

## 2. How we work
- Read IDEA_SCOPE.md, PRODUCT.md, PLAN.md and PROGRESS.md before anything else, and DESIGN.md before any screen work.
- Before writing code, tell me in two or three sentences what you think I'm after, then your plan. Wait for my yes. Don't guess.
- One milestone at a time: the next one in PLAN.md, working end to end. Nothing outside it.
- If I ask for something new mid-milestone, add it to the parked list in PLAN.md and carry on.
- Never say "done" until you've seen it work (in a test Whatsapp group) and told me how to check it on my phone.
- When I report a bug, find the cause before changing anything. Fix only that.
- When we add something new, write tests so what already works doesn't break. When I drop a feature, drop its tests.
- Build and test only in WhatsApp. No web test page for a product that lives somewhere else.
- After I confirm a milestone works: commit, push, and add one line to PROGRESS.md.
- Never put a key or password in code, in a VITE_ variable (those are sent to every visitor) or in a committed file.
- When a reply is unclear, instead of guessing the helper should ask the Secretary privately for help.
- Latest user correction: do not send individual role replies or conflict notes in the group. Only update the table; keep availability checks and holder protection internal.
- When reporting board updates or checking a posted board, inspect every visible role, not only speakers. Report all filled roles and verify the posted image matches the current approved board.

## 3. Shipping
Live link: [.convex.site link]
Repo: [(https://github.com/pankajk0001/builder-spring-growthx)], public
Deploy: npm run deploy. A push never deploys by itself. After I say a milestone works: commit, push, then deploy.
Keys: the_helper_key lives in hermes on my lapton, set for dev and for prod. Never in code, a VITE_ variable or a committed file. Never ask me to paste it into chat.
.gitignore covers .env.local.
Real people's data (chats, names, phone numbers) never goes in the repo, not even as a test file. Tests use made-up examples.
Every limit and every "is this allowed" check happens on my laptop, never only on screen.
Before I post in a group: I post in the test group, on mobile data, and do the core flow once.

## 4. The AI call
Model: gpt-6.1-sol via OpenAI Codex (selected by the user)
What goes in, and its limit: at most 300 messages
Key: the_helper_key on my laptop.
Where it runs: hermes on my laptop.
Reply cap: max_output_tokens 500
Calls cap: at most 100 AI calls an hour across the app
Provider limit: $5
When a cap is hit or the call fails: show "[ask the secretary to try again in few minutes]"
Login: none in v1
The AI must never: answer that is not related to role-board
