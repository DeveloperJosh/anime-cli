const inquirer = require('inquirer');
const fetchAnime = require('../utils/fetchAnime');
const fetchEpisodes = require('../utils/fetchEpisodes');
const { exec } = require('child_process');
const axios = require('axios');
const cheerio = require('cheerio');


async function watchAnime() {
    try {
        const { animeName } = await inquirer.prompt({
            type: 'input',
            name: 'animeName',
            message: 'Enter the name of the anime:'
        });

        const animeList = await fetchAnime(animeName);

        if (animeList.length === 0) {
            console.log('No anime found.');
            return;
        }

        const { animeChoice } = await inquirer.prompt({
            type: 'list',
            name: 'animeChoice',
            message: 'Select an anime:',
            choices: animeList.map(anime => ({
                name: anime.name,
                value: anime
            }))
        });

        console.log(`Fetching episodes from: ${animeChoice.url}`);
        const episodes = await fetchEpisodes(animeChoice.url);

        if (episodes.length === 0) {
            console.log('No episodes found.');
            return;
        }

        const { episodeChoice } = await inquirer.prompt({
            type: 'list',
            name: 'episodeChoice',
            message: 'Select an episode to stream:',
            choices: episodes.map(episode => ({
                name: episode.title,
                value: episode.url
            }))
        });

        const episodePageResponse = await axios.get(episodeChoice);
        const $ = cheerio.load(episodePageResponse.data);
        const videoUrl = $('a[rel="13"]').attr('data-video');

        if (videoUrl) {
            console.log(`Playing: ${videoUrl}`);
            exec(`mpv ${videoUrl}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error playing video: ${error.message}`);
                    return;
                }
            });
        } else {
            console.log('No stream link found.');
        }
    } catch (error) {
        console.error('Error watching anime:', error.message);
    }
}

module.exports = watchAnime;
