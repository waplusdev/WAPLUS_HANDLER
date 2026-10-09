// @musteqeem — WaPlus message-level group automations; intentionally separate from command routing.
const config = require('../config');
const db = require('./lib/database');
const { serialize } = require('./lib/serialize');

const quizzes = new Map();
const tempKicks = new Map();
const digit = (jid = '') => String(jid).split('@')[0].split(':')[0];
const groupPolicy = (jid) => db.get(`groupPolicy:${jid}`, {});
const savePolicy = (jid, next) => db.set(`groupPolicy:${jid}`, { ...groupPolicy(jid), ...next });
const isLink = (text = '') => /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/|discord\.gg\/)[^\s]+/i.test(text);

async function participantAdmin(sock, jid, sender) {
  try {
    const meta = await sock.groupMetadata(jid);
    const p = meta.participants?.find((x) => [x.id, x.jid, x.lid, x.phoneNumber].filter(Boolean).some((v) => digit(v) === digit(sender)));
    return !!p?.admin;
  } catch {
    return false;
  }
}

async function handleMessage(sock, raw) {
  if (!raw?.message || raw.key?.fromMe || raw.key?.remoteJid === 'status@broadcast') return false;
  const m = serialize(sock, raw);
  if (!m.isGroup) return false;
  const jid = m.chat;
  const policy = groupPolicy(jid);

  if (policy.antilink && isLink(m.body)) {
    const authorAdmin = await participantAdmin(sock, jid, m.sender);
    const owner = config.ownerNumbers.includes(m.number);
    const botAdmin = await participantAdmin(sock, jid, sock.user?.id || '');
    if (!authorAdmin && !owner && botAdmin) {
      await sock.sendMessage(jid, { delete: raw.key }).catch(() => {});
      await sock.sendMessage(jid, { text: `Link removed: links are disabled in this group, @${digit(m.sender)}.`, mentions: [m.sender] }).catch(() => {});
      return true;
    }
  }

  const active = quizzes.get(jid);
  if (active && Date.now() < active.expiresAt && m.body && m.body.toLowerCase() === active.answer) {
    quizzes.delete(jid);
    await sock.sendMessage(jid, { text: `Correct, @${digit(m.sender)}! ${active.explanation || ''}`.trim(), mentions: [m.sender] });
    return true;
  }
  return false;
}

async function handleParticipantsUpdate(sock, update) {
  if (!update?.id || !Array.isArray(update.participants)) return;
  const policy = groupPolicy(update.id);
  for (const participant of update.participants) {
    const jid = typeof participant === 'string' ? participant : participant.id || participant.jid;
    if (!jid) continue;
    const key = `${update.id}:${digit(jid)}`;
    if (update.action === 'add') {
      const entry = tempKicks.get(key);
      if (entry && entry.expiresAt > Date.now()) {
        try {
          const meta = await sock.groupMetadata(update.id);
          const bot = meta.participants?.find((p) => [p.id, p.jid, p.lid].filter(Boolean).some((v) => digit(v) === digit(sock.user?.id)));
          if (bot?.admin) await sock.groupParticipantsUpdate(update.id, [jid], 'remove');
        } catch (err) {
          console.error('[tempkick]', err.message);
        }
      }
      if (policy.welcome) {
        const text = (policy.welcomeText || 'Welcome @user to @group!').replace(/@user/g, `@${digit(jid)}`).replace(/@group/g, policy.groupName || 'the group');
        await sock.sendMessage(update.id, { text, mentions: [jid] }).catch(() => {});
      }
    }
    if (update.action === 'remove' && policy.goodbye) {
      const text = (policy.goodbyeText || 'Goodbye @user.').replace(/@user/g, `@${digit(jid)}`).replace(/@group/g, policy.groupName || 'the group');
      await sock.sendMessage(update.id, { text, mentions: [jid] }).catch(() => {});
    }
  }
}

function startQuiz(groupJid, question, answer, explanation = '') {
  quizzes.set(groupJid, { answer: String(answer).trim().toLowerCase(), explanation, expiresAt: Date.now() + 5 * 60_000 });
  return question;
}

async function scheduleTempKick(sock, groupJid, userJid, durationMs) {
  const key = `${groupJid}:${digit(userJid)}`;
  const expiresAt = Date.now() + durationMs;
  tempKicks.set(key, { jid: userJid, expiresAt });
  const previous = tempKicks.get(`${key}:timer`);
  if (previous) clearTimeout(previous);
  const timer = setTimeout(() => tempKicks.delete(key), durationMs);
  timer.unref?.();
  tempKicks.set(`${key}:timer`, timer);
  const [result] = await sock.groupParticipantsUpdate(groupJid, [userJid], 'remove');
  if (result?.status && result.status !== '200') {
    clearTimeout(timer);
    tempKicks.delete(key);
    tempKicks.delete(`${key}:timer`);
    throw new Error(`WhatsApp returned status ${result.status}`);
  }
  return expiresAt;
}

module.exports = { handleMessage, handleParticipantsUpdate, startQuiz, scheduleTempKick, savePolicy, groupPolicy, digit };
