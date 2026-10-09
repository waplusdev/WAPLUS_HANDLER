// @musteqeem — Temporarily remove a member and remove rejoin attempts until the timer expires.
const { scheduleTempKick } = require('../../message-handler');
const parseDuration = (value = '') => {
  const match = value.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  const scale = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2].toLowerCase()];
  const duration = amount * scale;
  return duration >= 10_000 && duration <= 7 * 86_400_000 ? duration : 0;
};
module.exports = {
  name: 'tempkick', alias: ['tkick'], desc: 'Temporarily remove a member', group: true, admin: true, botAdmin: true,
  async run({ sock, m, args, target, reply, fail }) {
    const user = target();
    if (!user) return fail('Choose a member', 'Mention, reply to, or type the number of the member to remove.');
    const duration = parseDuration(args.find((arg) => /^\d+[smhd]$/i.test(arg)));
    if (!duration) return fail('Invalid duration', 'Choose 10s–7d, for example .tempkick @user 30m.');
    if (user.split('@')[0].split(':')[0] === sock.user?.id?.split('@')[0].split(':')[0]) return fail('Not allowed', 'I cannot tempkick myself.');
    try {
      const expiresAt = await scheduleTempKick(sock, m.chat, user, duration);
      const remaining = Math.max(1, expiresAt - Date.now());
      const durationLabel = remaining < 60_000 ? `${Math.ceil(remaining / 1000)} second(s)` : remaining < 3_600_000 ? `${Math.ceil(remaining / 60_000)} minute(s)` : remaining < 86_400_000 ? `${Math.ceil(remaining / 3_600_000)} hour(s)` : `${Math.ceil(remaining / 86_400_000)} day(s)`;
      await reply(`⏱ Temporarily removed @${user.split('@')[0].split(':')[0]} for about ${durationLabel}. Rejoin attempts will be removed while the timer is active.`, { mentions: [user] });
    } catch (err) {
      return fail('Temporary removal failed', err.message);
    }
  },
};
