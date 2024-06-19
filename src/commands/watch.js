const inquirer = require('inquirer');
const axios = require('axios');
const { exec } = require('child_process');

const fetchAnime = require('../utils/fetchAnime');
const fetchEpisodes = require('../utils/fetchEpisodes');
const History = require('../utils/history');
const playVideo = require('../utils/player');
const configLoader = require('../utils/configLoader');
const setRichPresence = require('../utils/discord');
const animeList = require('../utils/animelist');

const config = configLoader();
const history = new History();
const animelist= new animeList(); // TODO: add this to player menu

let currentAnime = null; // Global variable to hold the current anime choice
let currentEpisode = null; // Global variable to hold the current episode choice

async function watchAnime() {
    console.clear();
    console.log('Welcome to the NekoNode!');
    exec('mpv --version', (error, stdout, stderr) => {
        if (error) {
            console.error('MPV player is required to watch anime. Please install it first, then try again. You can download it from https://mpv.io/');
            process.exit();
        }
    });
    await displayMenu();
}

async function displayMenu() {
    currentAnime = null;
    currentEpisode = null;
    let exit = false;
    while (!exit) {
        const { action } = await inquirer.prompt({
            type: 'list',
            name: 'action',
            message: 'Select an option:',
            choices: ['Search', 'Exit']
        });

        if (action === 'Search') {
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
            choices: animeList.map(anime => ({ name: anime.name, value: anime }))
        });

        currentAnime = animeChoice; // Save the selected anime to the global variable
        await selectEpisode();
    } catch (error) {
        console.error('Error selecting anime:', error.message);
    }
}

async function selectEpisode() {
    const episodeData = await fetchEpisodes(currentAnime.url);
    if (!episodeData || episodeData.episodes.length === 0) {
        console.log('No episodes found.');
        return;
    }

    const { episodeChoice } = await inquirer.prompt({
        type: 'list',
        name: 'episodeChoice',
        message: `Select an episode from ${episodeData.animeName}:`,
        choices: episodeData.episodes.map(episode => ({ name: episode.title, value: episode }))
    });

    const episodeId = episodeChoice.url.split('/').pop();
    const response = await axios.get(`${config.api}/anime/gogoanime/watch/${episodeId}`, {
        params: {
            server: 'gogocdn'
        }
    });
    let videoUrl = findVideoUrl(response.data.sources);

    history.save(currentAnime.name, episodeChoice.title, episodeChoice.url, videoUrl);
    playVideo(videoUrl, currentAnime.name, episodeChoice.title);
    currentEpisode = episodeChoice; // Save the selected episode to the global variable
    setRichPresence(`Watching ${currentAnime.name} - ${episodeChoice.title}`, `Using the ${config.player} player`, Date.now(), 'nekocli', 'NekoNode', 'logo2', 'Active');
    await episodeMenu(episodeId);
}

function findVideoUrl(sources) {
    let videoUrl = sources.find(source => source.quality === '1080p')?.url;
    if (!videoUrl) {
        videoUrl = sources.find(source => source.quality === 'backup')?.url;
    }
    return videoUrl;
}

async function episodeMenu(currentEpisodeId) {
    console.clear();
    if (!currentEpisodeId) {
        console.log('Error: No episode ID provided.');
        return;
    }

    //console.log(`You are currently watching ${currentAnime.name}.`);
    const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'Select an option:',
        choices: ['Anime Info', 'Next Episode', 'Previous Episode', 'Return to main menu']
    });

    if (action === 'Next Episode') {
        await nextEpisode(currentEpisodeId);
    } else if (action === 'Anime Info') {
        console.clear();
        let name = currentAnime.name;
        let animeNameSlug = name.toLowerCase().replace(/\s/g, '-');
        // make a regex to check for -(dub), :, and other special characters

        let specialChars = /[^a-zA-Z0-9\s]/g;
        animeNameSlug = animeNameSlug.replace(specialChars, '');
        // check for :
        if (animeNameSlug.includes(':')) {
            animeNameSlug = animeNameSlug.replace(':', '');
        }
        // check for -(dub)
        if (animeNameSlug.includes('-(dub)')) {
            animeNameSlug = animeNameSlug.replace('-(dub)', '');
        }
        let url = `${config.api}/anime/gogoanime/info/${animeNameSlug}`
        ///console.log(`DEBUG: ${url}`);
        const response = await axios.get(url);
        let animeInfo = response.data;
        let text = `Title: ${animeInfo.title}\nTotal Episodes: ${animeInfo.totalEpisodes}\nGenres: ${animeInfo.genres.join(', ')}\nStatus: ${animeInfo.status}\nRelease Date: ${animeInfo.releaseDate}\nType: ${animeInfo.type}\nDescription: ${animeInfo.description}`;
        console.log(text);
        // hit enter to go back to the episode menu
        const { back } = await inquirer.prompt({
            type: 'input',
            name: 'back',
            message: 'Hit enter to go back'
        });
        await episodeMenu(currentEpisodeId);
    }
    else if (action === 'Previous Episode') {
        await previousEpisode(currentEpisodeId);
    } else if (action === 'Return to main menu') {
        await displayMenu();
    }
}

async function nextEpisode(currentEpisodeId) {
    let basePart = currentEpisodeId.substring(0, currentEpisodeId.lastIndexOf('-') + 1);
    let episodeNumber = parseInt(currentEpisodeId.substring(currentEpisodeId.lastIndexOf('-') + 1)) + 1;
    const nextEpisodeId = `${basePart}${episodeNumber}`;

    const response = await axios.get(`${config.api}/anime/gogoanime/watch/${nextEpisodeId}`, {
        params: {
            server: 'gogocdn'
        }
    });

    let videoUrl = findVideoUrl(response.data.sources);
    
    if (!videoUrl) {
        console.log('No more episodes found.');
        return;
    }

    history.save(currentAnime.name, `EP ${episodeNumber}`, response.data.link, videoUrl);
    //    history.save(currentAnime.name, episodeChoice.title, episodeChoice.url, videoUrl);
    playVideo(videoUrl, currentAnime.name, `Episode ${episodeNumber}`);
    setRichPresence(`Watching ${currentAnime.name} - Episode ${episodeNumber}`, `Using the ${config.player} player`, Date.now(), 'nekocli', 'NekoNode', 'logo2', 'Active');
    await episodeMenu(nextEpisodeId);
}

async function previousEpisode(currentEpisodeId) {
    let basePart = currentEpisodeId.substring(0, currentEpisodeId.lastIndexOf('-') + 1);
    let episodeNumber = parseInt(currentEpisodeId.substring(currentEpisodeId.lastIndexOf('-') + 1)) - 1;
    const previousEpisodeId = `${basePart}${episodeNumber}`;

    const response = await axios.get(`${config.api}/anime/gogoanime/watch/${previousEpisodeId}`, {
        params: {
            server: 'gogocdn'
        }
    });
    let videoUrl = findVideoUrl(response.data.sources);

    if (!videoUrl) {
        console.log('No more episodes found.');
        return;
    }

    history.save(currentAnime.name, `EP ${episodeNumber}`, response.data.link, videoUrl);
    playVideo(videoUrl, currentAnime.name, `Episode ${episodeNumber}`);
    setRichPresence(`Watching ${currentAnime.name} - Episode ${episodeNumber}`, `Using the ${config.player} player`, Date.now(), 'nekocli', 'NekoNode', 'logo2', 'Active');
    await episodeMenu(previousEpisodeId);
}

module.exports = watchAnime;