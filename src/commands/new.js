// commands/new.js
const axios = require('axios');
const cheerio = require('cheerio');
const loadConfig = require('../utils/configLoader');
const ora = require('ora');
var Table = require('cli-table3');

const config = loadConfig();

async function fetchNewestAnime() {
    const spinner = ora('Fetching newest anime').start();
    const newAnimeUrl = `${config.baseUrl}/`;
    try {
        const response = await axios.get(newAnimeUrl);
        const $ = cheerio.load(response.data);
        const animeList = [];

        $('.last_episodes .items li').each((_, element) => {
            const animeElement = $(element);
            const animeName = animeElement.find('.name a').attr('title').trim();
            const episodeUrl = animeElement.find('.name a').attr('href');
            const episodeNumber = animeElement.find('.episode').text().trim();
            const imgUrl = animeElement.find('.img a img').attr('src');

            animeList.push({
                name: animeName,
                episode: episodeNumber,
                //url: `${config.baseUrl}${episodeUrl}`,
                //img: imgUrl
            });
        });

        spinner.stop();
        console.info('Newest anime:');
        const table = new Table({
            head: ['Name', 'Episode'],
            colWidths: [60, 20]
        });
        animeList.forEach(anime => {
            table.push([anime.name, anime.episode]);
        });

        console.log(table.toString());
        process.exit(0);
    } catch (error) {
        console.error('Error fetching newest anime:', error.message);
        return [];
    }
}

module.exports = fetchNewestAnime;
