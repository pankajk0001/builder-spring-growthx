// Entirely fictional. These names and messages do not come from any club.
module.exports = {
  board: [
    { role: 'Timer', member: 'Mira Example' },
    { role: 'Grammarian', member: null },
    { role: 'Ah Counter', member: 'Toby Example' },
    { role: 'Listener', member: null },
  ],
  messages: [
    { id: 'fictional-1', sender: 'Noel Example', text: 'I will take Grammarian if it is free.' },
    { id: 'fictional-2', sender: 'Lena Example', text: 'I will take Timer.' },
    { id: 'fictional-3', sender: 'Toby Example', text: 'I cannot make it. Please open my Ah Counter role.' },
    { id: 'fictional-4', sender: 'Iris Example', text: 'I can take Ah Counter.' },
    { id: 'fictional-5', sender: 'Noel Example', text: 'Looking forward to the meeting!' },
    { id: 'fictional-6', sender: 'Lena Example', text: 'Count me in for that one.' },
  ],
  // Expected interpretation for unit tests only; live intent must come from Hermes.
  decisions: [
    { messageId: 'fictional-1', intent: 'take', role: 'Grammarian' },
    { messageId: 'fictional-2', intent: 'take', role: 'Timer' },
    { messageId: 'fictional-3', intent: 'drop', role: 'Ah Counter' },
    { messageId: 'fictional-4', intent: 'take', role: 'Ah Counter' },
    { messageId: 'fictional-5', intent: 'ignore' },
    { messageId: 'fictional-6', intent: 'clarify' },
  ],
  expected: [
    { role: 'Timer', member: 'Mira Example' },
    { role: 'Grammarian', member: 'Noel Example' },
    { role: 'Ah Counter', member: 'Iris Example' },
    { role: 'Listener', member: null },
  ],
};
