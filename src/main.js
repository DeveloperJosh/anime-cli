#!/usr/bin/env node

const { Command } = require('commander');
const watchAnime = require('./commands/watch');
const inquirer = require('inquirer');
const fetchNewestAnime = require('./commands/new');

const program = new Command();
program
    .name('AniNode')
    .version('1.0.2')
    .description('The newest anime steaming CLI, AniNode may be slow for now as i move to a new anime source.');

program
    .command('watch')
    .description('This command will allow you to watch anime from the command line.')
    .action(watchAnime);

program
    .command('new')
    .description('This command will allow you to get the newest anime from the command line.')
    .action(fetchNewestAnime);

program
    .command('config')
    .description('This will give you the path to the config file.')
    .action(() => {
        console.log(`${process.env.APPDATA}/anime-cli/config.yml`);
    });

program
    .command('history')
    .description('TThis will let you clear or view your history, you can use the -c flag to clear the history.')
    .option('-c, --clear', 'Clear the history')
    .action(async (options) => {
        if (options.clear) {
            const History = require('./utils/history');
            const history = new History();
            history.clearHistory();
            console.log('History cleared.');
            process.exit();
        } else {
            const History = require('./utils/history');
            const history = new History();
            const historyList = history.getHistory();
            if (historyList.length === 0) {
                console.log('No history found.');
                process.exit();
            }

            const { historyItem } = await inquirer.prompt({
                type: 'list',
                name: 'historyItem',
                message: 'Select an item to watch:',
                choices: historyList.map(item => ({
                    name: `${item.animeName} - Episode ${item.episode}`,
                    value: item
                }))
            });

            const { steamLink } = historyItem;
            const playVideo = require('./utils/player');
            playVideo(steamLink);
        }
    });
program.parse(process.argv);