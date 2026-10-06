# DESIGN.md
Read this before building or changing any screen. If a choice isn't covered here, ask me instead of guessing.

## 1. The feeling, in labels
Page: https://www.wati.io/
How I looked: refreshed, scrolled very slowly, said it out loud.
1. [Primary Button]: [ask user for main action], [second biggest element after the heading, and has contrast that attract attention from the start]

2. [Heading]: [tell user what does the product do], [biggest element on the screen, has a continues animation that changes the part of the headline]

3. [sub-heading]: [a short description of the product], [1/3 of the heading lighter than the heading, no animation]

4. [Navigation]: [necessary links to navigate the website, primary cta, secondary cta, and logo on left], [sticks at the top even after scrolling, each link is clear, and has hover effect when we hover over it]

5. [Section]: [explains features of the product], [a heading, a subheading, and a CTA button on the left and a .gif image on the right]

6. [Footer]: [shows all the links, logo, and Terms & conditions, and privacy policy links], [completely contrasted section at bottom with all the link under different headings]

## 2. References, one per component
[CTA buttons]: ./cta.png
Take: The contrast and how the twos buttons are different.
Ignore: colors

[section]: ./section.png
take: how the layout of section is.
ignore: NA

[footer]: ./footer.png
take: how the links are categorised and what all is there in the footer.
ignore: Get the app

[navigation]: ./nav.png
take: how the navigation is laidout
ignore: colors

[role-board]: ./roleboard.heic

## 3. Type and colour
Font: [Inter]
Sizes: [Heading: 48px, body[16px], sub-heading[24px] ]
Colours: &#32;soft cream, pink, and blue backgrounds, roughly `#FFF5EB`, `#FCF0FF`, and `#E6F4FF`. Yellow highlights and green messaging icons give the page a consistent identity.

## 4. Screens
Flow: [prepare role board > preview > post role board in group]

Screen 1 -  Prepare role board
For: Secretary preparing this week's board
Top to bottom: Reminder and label to enter roles that are already filled and an input from secretary for the roles
Action: Generate Preview
Goes to: Board preview & approval
Empty: Nothing to show yet get typing so we can begin.
Loading: Default Typing animation of Whatsapp.
Error: Not able to generate preview and the helper confirms that and asks the secretary to try again to generate the preview.
Done: Next screen
If the AI answer is wrong: They can edit it.



Screen 2 - Board preview & approval
For: Secretary checking the board before it goes live
Top to bottom: Generated role-board image + message explaining it hasn't been posted yet
Action: Approve & Post Primary and Edit secondary action
Goes to: WhatsApp group after approval.
Empty: Nothing to show
Loading: default typing animation of Whatsapp.
Error: After approval the helpter doesn't take to the group chat and the helper confirms that the board is not posted in the group yet and asks the secretary to try again.
Done: Next screen
If the AI answer is wrong: They can edit it.


Screen 3 - Group role board
For: Toastmsters group
Top to bottom: Role-board image + short message
Action: none
Goes to: none.
Empty: Nothing to show
Loading: default typing animation of whatsapp
Error: the board image was not posted. The helper message the secretary about the error that the board is not posted. Want to post manually.
Done: none
If the Ai answer is wrong: they will let the AI know to fix

Screen 4 - Correct a role-board mistake
For - Secretary correcting something after the board has been posted
Top to bottom: Current board + Chat/input for the correction
Action: Confirm correction
Goes to: Corrected board is posted immediately to the group.
Empty: nothing to show
Loading: default typing animation of whatsapp
Error: Corrected board was not posted immediately and the helper confirms that is was not posted and asks the secretary to try again.
Done: when corrected board is approved

## 5. The first screen's words
Headline: [AI helper for Toastmaster club leaders so that they can focus on the helping speakers prepare] 
Under it: [Read members replies, updates the role-board, and posts the board in Whatsapp]
Button: [Get Started]

## 6. Principles
- Each screen should do one clear job with one obvious next action.
- A screen should explain itself within five seconds.
- Use concrete Toastmasters language, not generic product language.