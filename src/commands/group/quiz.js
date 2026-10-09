// @musteqeem — Start a five-minute group quiz; use .quiz question | answer | optional explanation.
const { startQuiz } = require('../../message-handler');
const BANK = [
  { q: 'Quick quiz: What is the capital of Japan?', a: 'tokyo', e: 'Tokyo is Japan’s capital.' },
  { q: 'Quick quiz: How many sides does a hexagon have?', a: '6', e: 'A hexagon has six sides.' },
  { q: 'Quick quiz: Which planet is known as the Red Planet?', a: 'mars', e: 'Mars is commonly called the Red Planet.' },
];
module.exports = {
  name: 'quiz', alias: ['trivia'], desc: 'Start a group quiz', group: true,
  async run({ m, args, reply, ui }) {
    let question;
    let answer;
    let explanation = '';
    if (args.length) {
      const parts = args.join(' ').split('|').map((part) => part.trim());
      if (parts.length < 2 || !parts[0] || !parts[1]) return reply(ui.notice('info', 'Quiz format', 'Use .quiz question | answer | optional explanation'));
      [question, answer, explanation = ''] = parts;
    } else {
      ({ q: question, a: answer, e: explanation } = BANK[Math.floor(Math.random() * BANK.length)]);
    }
    startQuiz(m.chat, question, answer, explanation);
    await reply(`✦ GROUP QUIZ\n\n${question}\n\nFirst correct answer wins. Answers expire in 5 minutes.`);
  },
};
