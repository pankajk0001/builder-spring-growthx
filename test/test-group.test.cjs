const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTestGroupSender } = require('../src/test-group.cjs');

const groupId = '123456789000000@g.us'; // Invented group ID; never used live.
const sessionPath = '/fictional/hermes/session';
function bridge({ name = 'Test_group', session = sessionPath, success = true } = {}) {
  const calls = [];
  return { calls, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => url.endsWith('/health')
      ? { status: 'connected', session }
      : url.includes('/chat/') ? { isGroup: true, name }
      : { success, messageId: success ? 'fictional-receipt' : undefined } };
  } };
}

test('sends only to the configured ID after confirming Test_group', async () => {
  const fake = bridge();
  const sender = createTestGroupSender({ groupId, sessionPath, fetchImpl: fake.fetchImpl });
  await sender.send('A fictional role-board test.');
  const sent = fake.calls.filter(call => call.url.endsWith('/send'));
  assert.equal(sent.length, 1);
  assert.equal(JSON.parse(sent[0].options.body).chatId, groupId);
  assert.equal(fake.calls.some(call => call.url.endsWith('/messages')), false);
});

test('blocks another group before any send', async () => {
  const fake = bridge({ name: 'Fictional other group' });
  const sender = createTestGroupSender({ groupId, sessionPath, fetchImpl: fake.fetchImpl });
  await assert.rejects(sender.send('Do not send.'), /destination is not Test_group/);
  assert.equal(fake.calls.some(call => call.url.endsWith('/send')), false);
});

test('blocks a bridge belonging to a different paired account', async () => {
  const fake = bridge({ session: '/fictional/other/session' });
  const sender = createTestGroupSender({ groupId, sessionPath, fetchImpl: fake.fetchImpl });
  await assert.rejects(sender.send('Do not send.'), /intended Hermes/);
  assert.equal(fake.calls.length, 1);
});

test('rejects missing group IDs and personal-chat IDs', () => {
  assert.throws(() => createTestGroupSender({ groupId: '', sessionPath }), /exact Test_group/);
  assert.throws(() => createTestGroupSender({ groupId: '123456789@s.whatsapp.net', sessionPath }), /exact Test_group/);
});
