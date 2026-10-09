// @musteqeem — Toggle the event-handler's per-group link moderation rule.
const { savePolicy, groupPolicy } = require('../../message-handler');
module.exports = {
  name: 'antilink', alias: ['linkguard'], desc: 'Toggle group link moderation', group: true, admin: true,
  async run({ sock, m, args, reply, ui }) {
    const current = !!groupPolicy(m.chat).antilink;
    const value = /^(on|enable|yes)$/i.test(args[0] || '') ? true : /^(off|disable|no)$/i.test(args[0] || '') ? false : !current;
    const meta = await sock.groupMetadata(m.chat).catch(() => null);
    savePolicy(m.chat, { antilink: value, groupName: meta?.subject || 'the group' });
    await reply(ui.notice('success', `Anti-link ${value ? 'enabled' : 'disabled'}`, value ? 'Non-admin links will be removed when the bot is a group admin.' : 'Group members may now share links.'));
  },
};
