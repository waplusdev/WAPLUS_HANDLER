// @musteqeem — Configure group join messages. Supported tokens: @user and @group.
const { savePolicy, groupPolicy } = require('../../message-handler');
module.exports = {
  name: 'welcome', alias: ['setwelcome'], desc: 'Configure group welcome messages', group: true, admin: true,
  async run({ sock, m, args, reply, ui }) {
    const current = groupPolicy(m.chat);
    const mode = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(mode)) return reply(ui.notice('info', 'Welcome setup', 'Use .welcome on [message] or .welcome off. Tokens: @user and @group.'));
    const meta = await sock.groupMetadata(m.chat).catch(() => null);
    savePolicy(m.chat, { welcome: mode === 'on', welcomeText: args.slice(1).join(' ') || current.welcomeText || 'Welcome @user to @group!', groupName: meta?.subject || 'the group' });
    await reply(ui.notice('success', `Welcome messages ${mode === 'on' ? 'enabled' : 'disabled'}`, mode === 'on' ? `Template: ${args.slice(1).join(' ') || current.welcomeText || 'Welcome @user to @group!'}` : 'New members will not receive an automatic greeting.'));
  },
};
