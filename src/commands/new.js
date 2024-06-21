import axios from 'axios';
import { load } from 'cheerio';
import loadConfig from '../utils/configLoader.js';
import ora from 'ora';
import Table from 'cli-table3';
import chalk from 'chalk';
import inquirer from 'inquirer';
import watchAnime from './watch.js';

// Load configuration using the configLoader utility
const config = loadConfig();

async function fetchNewestAnime() {
    console.clear();
    const spinner = ora('Fetching newest anime...').start();
    const newAnimeUrl = `${config.baseUrl}/`;

    try {
        // Make a GET request to fetch the latest anime data
        const response = await axios.get(newAnimeUrl);
        const $ = load(response.data);
        const animeList = [];

        // Parse the HTML to extract anime information
        $('.last_episodes .items li').each((_, element) => {
            const animeElement = $(element);
            const animeName = animeElement.find('.name a').attr('title').trim();
            const episodeUrl = animeElement.find('.name a').attr('href');
            const episodeNumber = animeElement.find('.episode').text().trim();
            const imgUrl = animeElement.find('.img a img').attr('src');

            animeList.push({
                name: animeName,
                episode: episodeNumber,
                url: `${config.baseUrl}${episodeUrl}`,
               // img: imgUrl
            });
        });

        // Stop the spinner once the data is fetched and processed
        spinner.stop();

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
            table.push([
                chalk.blueBright(anime.name), 
                chalk.yellowBright(anime.episode)
            ]);
        });

        console.log(table.toString());
        
        // Display anime URLs with color
      //  animeList.forEach(anime => {
        //    console.log(`${chalk.magenta('Watch here:')} ${chalk.underline.cyan(anime.url)}`);
       // });

        // Exit the process successfully
        // back to the main menu
        await inquirer.prompt([
            {
                type: 'input',
                name: 'back',
                message: 'Press Enter to return to the menu...',
            }
        ]);
        console.clear();
        console.log(chalk.bgBlueBright('Welcome to NekoNode Watcher!'));
        await watchAnime();
    } catch (error) {
        // Handle errors and stop the spinner if an error occurs
        spinner.stop();
        console.error(chalk.red('Error fetching newest anime:'), chalk.redBright(error.message));
    }
}

export default fetchNewestAnime;
