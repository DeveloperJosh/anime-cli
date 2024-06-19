#!/usr/bin/env node
const { Command } = require('commander');
const watchAnime = require('./commands/watch');
const listAnime = require('./commands/list');
const fetchNewestAnime = require('./commands/new');
const History = require('./utils/history');
const history = new History();
var Table = require('cli-table3');

const program = new Command();
program
    .name('NekoNode')
    .version('1.1.0')
    .description('The newest anime steaming CLI');

program
    .command('watch')
    .description('Allows to watch what anime you want at 1080p quality.')
    .action(watchAnime);

program
    .command('new')
    .description('Shows the newest anime that is out.')
    .action(fetchNewestAnime);

program
    .command('list')
    .description('Anime list manager, you can add, remove, and view your anime list.')
    .action(listAnime);

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
            history.clearHistory();
            console.log('History cleared.');
            process.exit();
        } else {
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

program
    .command('about')
    .description('Learn more about this CLI and its creator.')
    .action(() => {
        console.clear();
        let about = `
Welcome to NekoNode! This CLI tool is designed to scrape anime information from the Gogoanime website. 
It was created out of a passion for both anime and web scraping, providing a simple way to find and access your favorite anime directly from the command line.
        
Developed with curiosity and a desire to learn, NekoNode is a testament to exploring new technologies and making the process of discovering anime more convenient.
        `;
        console.log(about);
        process.exit();
    });

program.parse(process.argv);