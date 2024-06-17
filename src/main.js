#!/usr/bin/env node

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

program
    .command('config')
    .description('This will give you the path to the config file.')
    .action(() => {
        console.log(`${process.env.APPDATA}/anime-cli/config.yml`);
    });

program.parse(process.argv);
