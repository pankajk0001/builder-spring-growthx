module.exports = {
  board: [{ role: 'Timer', member: 'Mira Example' }, { role: 'Listener', member: null }, { role: 'Grammarian', member: null }],
  messages: [
    { id: 'fictional-21', sender: 'Noel Example', text: 'Is Listener still open?' },
    { id: 'fictional-22', sender: 'Lena Example', text: 'Timer' },
    { id: 'fictional-23', sender: 'Iris Example', text: 'listener' },
    { id: 'fictional-24', sender: 'Noel Example', text: 'I would like Listener too.' },
    { id: 'fictional-25', sender: 'Lena Example', text: 'Who has Timer?' },
    { id: 'fictional-26', sender: 'Noel Example', text: 'Count me in for that one.' },
  ],
  expected: [{ role: 'Timer', member: 'Mira Example' }, { role: 'Listener', member: 'Iris Example' }, { role: 'Grammarian', member: null }],
  expectedReplies: ['The Listener role is open.', 'The Timer role is taken by Mira Example.', 'The Listener role is yours, Iris Example.', 'The Listener role is taken by Iris Example.', 'The Timer role is taken by Mira Example.'],
};
