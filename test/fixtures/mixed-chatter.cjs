// Realistic conversation, entirely invented. No real club messages or members.
const roles = require('./milestone-2.cjs');
const chatter = [
  { id: 'fictional-31', sender: 'Toby Example', text: 'Good morning everyone! How was your weekend?' },
  { id: 'fictional-32', sender: 'Mira Example', text: 'Does anyone know if the cafe near the venue is open?' },
  { id: 'fictional-33', sender: 'Toby Example', text: 'My phone timer stopped working while I was cooking yesterday.' },
  { id: 'fictional-34', sender: 'Mira Example', text: 'Thanks for the photos, they look great!' },
  { id: 'fictional-35', sender: 'Toby Example', text: 'I am a terrible listener when my favourite song is playing!' },
];
module.exports = {
  ...roles,
  messages: [chatter[0], roles.messages[0], chatter[1], roles.messages[1], chatter[2], roles.messages[2], chatter[3], roles.messages[3], chatter[4], roles.messages[4], roles.messages[5]],
  chatterIds: chatter.map(message => message.id),
};
