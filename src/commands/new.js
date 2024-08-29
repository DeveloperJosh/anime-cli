import axios from 'axios';
import loadConfig from '../utils/configLoader.js';
import ora from 'ora';
import Table from 'cli-table3';
import chalk from 'chalk';
import inquirer from 'inquirer';
import watchAnime from './watch.js';

const config = loadConfig();

async function fetchNewestAnime() {
    console.clear();
    const spinner = ora('Fetching newest anime...').start();
    const newAnimeUrl = `${config.api}/api/latest`;

    try {
        const response = await axios.get(newAnimeUrl);
        const animeList = response.data;

        console.clear();

        /*
        how the data is structured:
        [
            {
                name: 'title',
                encodedName: 'encodedTitle',
                lang: 'sub',
                image: 'imageLink',
                url: 'animeLink'
            }
        ]
        */
        console.info(chalk.cyanBright.bold('\nNewest Anime Releases:\n'));

        // Determine the maximum length of anime names
        const maxNameLength = Math.max(...animeList.map(anime => anime.name.length), 10);

        // Display the anime list in a table format with dynamic column width
        const table = new Table({
            head: [chalk.greenBright('Name'), chalk.greenBright('Episode')],
            colWidths: [Math.min(maxNameLength + 10, 100), 20], // Ensure a reasonable upper limit for the column width
            style: { 
                head: [], 
                border: [], 
                compact: true 
            }
        });

        animeList.forEach(anime => {
            let url = anime.url;
            // Extract the episode number from the URL
            let episodeMatch = url.match(/(?:episode-)(\d+)/i);
            let episodeNumber = episodeMatch ? episodeMatch[1] : 'N/A';
            table.push([
                chalk.blueBright(anime.name), 
                chalk.yellowBright(episodeNumber)
            ]);
        });

        console.log(table.toString());
    
        spinner.stop();

        await inquirer.prompt([
            {
                type: 'input',
                name: 'back',
                message: 'Press Enter to return to the menu...',
            }
        ]);
        console.clear();
        //console.log(chalk.bgBlueBright('Welcome to NekoNode Watcher!'));
        await watchAnime();
    } catch (error) {
        // Handle errors and stop the spinner if an error occurs
        spinner.stop();
        console.error(chalk.red('Error fetching newest anime:'), chalk.redBright(error.message));
    }
}

export default fetchNewestAnime;
