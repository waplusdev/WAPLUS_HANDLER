// @musteqeem — Configure group departure messages. Supported tokens: @user and @group.
const { savePolicy, groupPolicy } = require('../../message-handler');
module.exports = {
  name: 'goodbye', alias: ['setgoodbye'], desc: 'Configure group goodbye messages', group: true, admin: true,
  async run({ sock, m, args, reply, ui }) {
    const current = groupPolicy(m.chat);
    const mode = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(mode)) return reply(ui.notice('info', 'Goodbye setup', 'Use .goodbye on [message] or .goodbye off. Tokens: @user and @group.'));
    const meta = await sock.groupMetadata(m.chat).catch(() => null);
    savePolicy(m.chat, { goodbye: mode === 'on', goodbyeText: args.slice(1).join(' ') || current.goodbyeText || 'Goodbye @user.', groupName: meta?.subject || 'the group' });
    await reply(ui.notice('success', `Goodbye messages ${mode === 'on' ? 'enabled' : 'disabled'}`, mode === 'on' ? `Template: ${args.slice(1).join(' ') || current.goodbyeText || 'Goodbye @user.'}` : 'Departing members will not receive an automatic message.'));
  },
};
