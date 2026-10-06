const { isSecretaryChat } = require('./approval-inbox.cjs');

// A returned sendMessage object is local. Wait for WhatsApp's server receipt
// before closing the connection or marking a final reply verified.
function createMessageAckTracker(events, identity, timeoutMs = 15000) {
  const accepted = new Set();
  const waiting = new Map();
  events.on('messages.update', updates => {
    for (const { key, update } of updates) {
      if (!key?.id || key.fromMe !== true || !(isSecretaryChat(key.remoteJid, identity) || (identity.targetGroupId && key.remoteJid === identity.targetGroupId)) ||
          ![2, 3, 4, 5].includes(update?.status)) continue;
      accepted.add(key.id);
      const pending = waiting.get(key.id);
      if (pending) { clearTimeout(pending.timer); waiting.delete(key.id); pending.resolve(); }
    }
  });
  events.on('message-receipt.update', updates => {
    for (const { key, receipt } of updates) {
      if (!identity.targetGroupId || key?.remoteJid !== identity.targetGroupId || key.fromMe !== true || !key.id ||
          !(receipt?.receiptTimestamp || receipt?.readTimestamp)) continue;
      accepted.add(key.id);
      const pending = waiting.get(key.id);
      if (pending) { clearTimeout(pending.timer); waiting.delete(key.id); pending.resolve(); }
    }
  });
  return {
    wait(id) {
      if (accepted.has(id)) return Promise.resolve();
      if (waiting.has(id)) return waiting.get(id).promise;
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      const timer = setTimeout(() => {
        waiting.delete(id); reject(new Error('WhatsApp has not acknowledged the reply yet.'));
      }, timeoutMs);
      waiting.set(id, { resolve, reject, timer, promise });
      return promise;
    },
  };
}
module.exports = { createMessageAckTracker };
