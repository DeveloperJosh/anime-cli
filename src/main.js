#!/usr/bin/env node

const { Command } = require('commander');
const watchAnime = require('./commands/watch');
const inquirer = require('inquirer');
const fetchNewestAnime = require('./commands/new');
var Table = require('cli-table3');

const program = new Command();
program
    .name('NekoNode')
    .version('1.0.4')
    .description('The newest anime steaming CLI, NekoNode may be slow for now as i move to a new anime source.');

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

            // show a list of history
            console.info('History:');
            const table = new Table({
                head: ['Anime Name', 'Episode', 'Link'],
                colWidths: [60, 20, 60]
            });
            historyList.forEach(history => {
                table.push([history.animeName, history.episode, history.link]);
            });

            console.log(table.toString());
            process.exit();
        }
    });
program.parse(process.argv);