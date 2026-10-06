const { assertPrivateSendReceipt } = require('./note-delivery.cjs');
const POSTED_MESSAGE = 'the helper — The board has been posted to Test_group.\nPlease check the board in the group and let me know if any edits are required. Reply TABLE to view the roles as a table, or EDIT to correct them.';
async function sendPostConfirmation({ state, secretaryId, socket, acknowledgements, save }) {
 if (!/^\d+@s\.whatsapp\.net$/.test(secretaryId) || state.secretaryId !== secretaryId || state.groupPost?.status !== 'sent' || state.groupPost.deliveryReceiptVerified !== true) throw new Error('A verified group post is required before confirming it privately.');
 if (state.groupPost.secretaryConfirmation?.status === 'sent') return;
 let notification = state.groupPost.secretaryConfirmation;
 if (notification && !notification.id) throw new Error('The private confirmation attempt is uncertain; check Secretary chat before retrying.');
 if (!notification) {
  state.groupPost.secretaryConfirmation = { status:'sending' }; await save(state);
  const sent = await socket.sendMessage(secretaryId,{text:POSTED_MESSAGE});
  assertPrivateSendReceipt(sent,secretaryId);
  if ((sent.message?.conversation ?? sent.message?.extendedTextMessage?.text) !== POSTED_MESSAGE) throw new Error('WhatsApp returned a different private confirmation.');
  notification = { status:'sending',id:sent.key.id };
  state.groupPost.secretaryConfirmation = notification; await save(state);
 }
 await acknowledgements.wait(notification.id);
 state.groupPost.secretaryConfirmation = {...notification,status:'sent',serverAckVerified:true};
 await save(state);
}
module.exports = {sendPostConfirmation,POSTED_MESSAGE};
