const { Command } = require('commander');
const watchAnime = require('./commands/watch');

const program = new Command();
program.version('1.0.0');

program
    .command('watch')
    .description('Search for an anime and watch an episode')
    .action(watchAnime);

program.parse(process.argv);
