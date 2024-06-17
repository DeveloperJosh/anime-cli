const inquirer = require('inquirer');
const fetchAnime = require('../utils/fetchAnime');
const fetchEpisodes = require('../utils/fetchEpisodes');
const axios = require('axios');
const cheerio = require('cheerio');
const History = require('../utils/history');
const playVideo = require('../utils/player');
const history = new History();

async function watchAnime() {
    console.log('Welcome to the Anime CLI!\n\nI get that the player takes a while to load, But I plan on fixing that soon.');

    try {
        // Prompt for anime name
        const { animeName } = await inquirer.prompt({
            type: 'input',
            name: 'animeName',
            message: 'Enter the name of the anime:'
        });

        // Fetch the list of animes
        const animeList = await fetchAnime(animeName);

        if (animeList.length === 0) {
            // ask them if they want to try again
            console.log('No anime found.');
            process.exit();
            return;
        }

        // Prompt for anime choice
        const { animeChoice } = await inquirer.prompt({
            type: 'list',
            name: 'animeChoice',
            message: 'Select an anime:',
            choices: animeList.map(anime => ({
                name: anime.name,
                value: anime
            }))
        });

        // Fetch the list of episodes
        const episodeData = await fetchEpisodes(animeChoice.url);
        if (!episodeData || episodeData.episodes.length === 0) {
            console.log('No episodes found.');
            return;
        }

        const { episodes, animeName: fetchedAnimeName } = episodeData;

        // Prompt for episode choice
        const { episodeChoice } = await inquirer.prompt({
            type: 'list',
            name: 'episodeChoice',
            message: `Select an episode from ${fetchedAnimeName}:`,
            choices: episodes.map(episode => ({
                name: episode.title,
                value: episode
            }))
        });

        if (episodeChoice.title === "End of List") {
            console.log('No episodes found.');
            return;
        } 

        // ask if the user wants to use mp4upload, streamwish, vidhide
        
        const { videoSource } = await inquirer.prompt({
            type: 'list',
            name: 'videoSource',
            message: 'Select a video source:',
            choices: [
                { name: 'mp4upload', value: 'mp4upload' },
                { name: 'streamwish', value: 'streamwish' },
            ]
        });

        // Fetch the video URL
        let videoUrl = '';
        const episodePageResponse = await axios.get(episodeChoice.url);
        const $ = cheerio.load(episodePageResponse.data);

        if (videoSource === 'mp4upload') {
         videoUrl = $('a[rel="3"]').attr('data-video');
        } else if (videoSource === 'streamwish') {

         videoUrl = $('a[rel="13"]').attr('data-video');
        }
        history.save(animeChoice.name, episodeChoice.title, episodeChoice.url, videoUrl)

        playVideo(videoUrl)

    } catch (error) {
        console.error('Error watching anime:', error.message);
    }
}

module.exports = watchAnime;
