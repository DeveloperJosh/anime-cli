const inquirer = require('inquirer');
const fetchAnime = require('../utils/fetchAnime');
const fetchEpisodes = require('../utils/fetchEpisodes');
const axios = require('axios');
const cheerio = require('cheerio');
const History = require('../utils/history');
const playVideo = require('../utils/player');
const parseScriptTags = require('../utils/parser');
const { exec } = require('child_process');
const configLoader = require('../utils/configLoader');
const setRichPresence = require('../utils/discord');

const config = configLoader();
const history = new History();

async function watchAnime() {
    console.log('Welcome to the Anime CLI!');
    exec('mpv --version', (error, stdout, stderr) => {
        if (error) {
            console.error('MPV player is required to watch anime. Please install it first, then try again. You can download it from https://mpv.io/');
            process.exit();
        }
    });

    await displayMenu();
}

async function displayMenu() {
    let exit = false;
    while (!exit) {
        const { action } = await inquirer.prompt({
            type: 'list',
            name: 'action',
            message: 'Select an option:',
            choices: ['Watch Anime', 'Exit']
        });

        if (action === 'Watch Anime') {
            await selectAnime();
        } else if (action === 'Exit') {
            console.log('Exiting...');
            exit = true;
            process.exit(0);
        }
    }
}

async function selectAnime() {
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

        await selectEpisode(animeChoice);
    } catch (error) {
        console.error('Error selecting anime:', error.message);
    }
}

async function selectEpisode(animeChoice) {
    const episodeData = await fetchEpisodes(animeChoice.url);
    if (!episodeData || episodeData.episodes.length === 0) {
        console.log('No episodes found.');
        return;
    }

    const { episodeChoice } = await inquirer.prompt({
        type: 'list',
        name: 'episodeChoice',
        message: `Select an episode from ${episodeData.animeName}:`,
        choices: episodeData.episodes.map(episode => ({
            name: episode.title,
            value: episode
        }))
    });

    await fetchVideoSource(episodeChoice);
}

async function fetchVideoSource(episodeChoice) {
    const episodePageResponse = await axios.get(episodeChoice.url);
    const $ = cheerio.load(episodePageResponse.data);
    const { videoSource } = await inquirer.prompt({
        type: 'list',
        name: 'videoSource',
        message: 'Select a video source:',
        choices: [
            { name: 'mp4upload', value: 'mp4upload' },
            { name: 'streamwish', value: 'streamwish' },
            { name: 'vidhide', value: 'vidhide'}
        ]
    });

    let videoUrl = '';
    if (videoSource === 'mp4upload') {
        videoUrl = $('a[rel="3"]').attr('data-video');
    } else if (videoSource === 'streamwish') {
        const tempUrl = $('a[rel="13"]').attr('data-video');
        videoUrl = await parseScriptTags(tempUrl);
    } else if (videoSource === 'vidhide') {
        const tempUrl = $('a[rel="15"]').attr('data-video');
        videoUrl = await parseScriptTags(tempUrl);
    }

    if (!videoUrl) {
        console.log('Video URL not found. Please try another source or episode.');
        return;
    }

    playVideo(videoUrl);
    history.save(episodeChoice.animeName, episodeChoice.title, episodeChoice.url, videoUrl);
    setRichPresence(
        `Watching ${episodeChoice.animeName} - ${episodeChoice.title}`,
        `Using the ${config.player} player`,
        Date.now(),
        'nekocli',
        'NekoNode',
        'logo2',
        'Active'
    );

    await promptToReturn();
}

async function promptToReturn() {
    await inquirer.prompt({
        type: 'input',
        name: 'return',
        message: 'Press enter to return to the main menu...'
    });
}

module.exports = watchAnime;
