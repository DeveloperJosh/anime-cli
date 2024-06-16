const { Command } = require('commander');
const watchAnime = require('./commands/watch');

const program = new Command();
program
    .name('anime-cli')
    .version('1.0.0')
    .description('Anime streaming CLI by DeveloperJosh');

program
    .command('watch')
    .description('This command will allow you to watch anime from the command line.')
    .action(watchAnime);

program.parse(process.argv);
