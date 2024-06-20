// commands/new.js
import axios from 'axios';
import { load } from 'cheerio';
import loadConfig from '../utils/configLoader.js';
import ora from 'ora';
import Table from 'cli-table3';

// Load configuration using the configLoader utility
const config = loadConfig();

async function fetchNewestAnime() {
    const spinner = ora('Fetching newest anime').start();
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
                img: imgUrl
            });
        });

        // Stop the spinner once the data is fetched and processed
        spinner.stop();

        console.info('Newest anime:');
        
        // Display the anime list in a table format
        const table = new Table({
            head: ['Name', 'Episode'],
            colWidths: [60, 20]
        });
        animeList.forEach(anime => {
            table.push([anime.name, anime.episode]);
        });

        console.log(table.toString());
        
        // Exit the process successfully
        process.exit(0);
    } catch (error) {
        // Handle errors and stop the spinner if an error occurs
        spinner.stop();
        console.error('Error fetching newest anime:', error.message);
        return [];
    }
}

export default fetchNewestAnime;
