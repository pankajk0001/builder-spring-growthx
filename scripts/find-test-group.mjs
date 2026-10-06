import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, writeFile, access } from 'node:fs/promises';

const hermesHome = join(homedir(), '.hermes');
const bridgeDir = join(hermesHome, 'hermes-agent', 'scripts', 'whatsapp-bridge');
const requireBridge = createRequire(join(bridgeDir, 'package.json'));
const baileys = await import(pathToFileURL(requireBridge.resolve('@whiskeysockets/baileys')).href);
const { default: pino } = await import(pathToFileURL(requireBridge.resolve('pino')).href);
const sessionPath = join(hermesHome, 'whatsapp', 'session');
await access(join(sessionPath, 'creds.json'));
const { state, saveCreds } = await baileys.useMultiFileAuthState(sessionPath);
const { version } = await baileys.fetchLatestBaileysVersion();
const sock = baileys.makeWASocket({
  auth: state, version, logger: pino({ level: 'silent' }),
  syncFullHistory: false, markOnlineOnConnect: false,
  // Ignore message synchronization for every chat. Only group names and IDs
  // are requested below, solely to find the user-authorized Test_group.
  shouldIgnoreJid: () => true,
});
sock.ev.on('creds.update', saveCreds);

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WhatsApp connection timed out.')), 45000);
    sock.ev.on('connection.update', ({ connection }) => {
      if (connection === 'open') { clearTimeout(timer); resolve(); }
      if (connection === 'close') { clearTimeout(timer); reject(new Error('WhatsApp connection closed.')); }
    });
  });
  const groups = await sock.groupFetchAllParticipating();
  const matches = Object.entries(groups).filter(([, group]) => group.subject === 'Test_group');
  if (matches.length !== 1) {
    throw new Error(matches.length === 0 ? 'No group named Test_group was found.' : 'More than one Test_group exists; the exact group must be selected.');
  }
  const dir = join(hermesHome, 'the-helper');
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(join(dir, 'test-group.json'), JSON.stringify({
    groupId: matches[0][0], name: 'Test_group', sessionPath,
  }, null, 2) + '\n', { mode: 0o600 });
  console.log('Found Test_group. Saved its ID outside the repository. No chat messages were read or sent.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  sock.end(undefined);
}
