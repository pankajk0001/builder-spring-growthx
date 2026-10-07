const TEST_GROUP_NAME = 'Test_group';

function assertRunnerHome(target, currentHome) {
  if (target.runnerHome && target.runnerHome !== currentHome) {
    throw new Error('This helper runs on the server. Keep this laptop copy stopped.');
  }
}

// Hermes's loopback bridge has no group-history endpoint. Do not poll its
// account-wide message queue: this app is authorized for Test_group only.
function createTestGroupSender({ groupId, sessionPath, bridgePort = 3000, fetchImpl = fetch }) {
  if (typeof groupId !== 'string' || !/^\d+(?:-\d+)?@g\.us$/.test(groupId)) {
    throw new Error('Configure the exact Test_group WhatsApp group ID locally.');
  }
  if (typeof sessionPath !== 'string' || !sessionPath.startsWith('/')) {
    throw new Error('Configure the paired Hermes session path locally.');
  }
  if (!Number.isInteger(bridgePort) || bridgePort < 1 || bridgePort > 65535) {
    throw new Error('Invalid local bridge port.');
  }
  const base = `http://127.0.0.1:${bridgePort}`;
  async function request(path, options) {
    const response = await fetchImpl(base + path, { ...options, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('The Hermes WhatsApp bridge is unavailable.');
    return response.json();
  }
  return {
    async send(message) {
      if (typeof message !== 'string' || !message.trim()) throw new Error('A message is required.');
      const health = await request('/health');
      if (health.status !== 'connected' || health.session !== sessionPath) {
        throw new Error('The intended Hermes WhatsApp session is not connected.');
      }
      const chat = await request('/chat/' + encodeURIComponent(groupId));
      if (chat.isGroup !== true || chat.name !== TEST_GROUP_NAME) {
        throw new Error('Blocked: the destination is not Test_group.');
      }
      const receipt = await request('/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: groupId, message }),
      });
      if (receipt.success !== true || !receipt.messageId) throw new Error('WhatsApp did not confirm the send.');
      return receipt;
    },
  };
}

module.exports = { TEST_GROUP_NAME, createTestGroupSender, assertRunnerHome };
