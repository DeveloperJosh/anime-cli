const inquirer = require('inquirer');
const axios = require('axios');
const { exec } = require('child_process');

const fetchAnime = require('../utils/fetchAnime');
const fetchEpisodes = require('../utils/fetchEpisodes');
const History = require('../utils/history');
const playVideo = require('../utils/player');
const configLoader = require('../utils/configLoader');
const setRichPresence = require('../utils/discord');

const config = configLoader();
const history = new History();

async function watchAnime() {
    console.clear();
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
        choices: episodeData.episodes.map(episode => ({ name: episode.title, value: episode }))
    });

    const episodeId = episodeChoice.url.split('/').pop();

    const response = await axios.get(`${config.api}/anime/gogoanime/watch/${episodeId}`);
    const videoSource = response.data.sources.find(source => source.quality === '1080p');
    const videoUrl = videoSource ? videoSource.url : null;
    
    if (!videoUrl) {
        // look for quality backup
        if (Array.isArray(response.data.sources)) {
            const videoSource = response.data.sources.find(source => source.quality === 'backup');
            videoUrl = videoSource ? videoSource.url : null;
        } else {
            console.error('Error: response.data.sources is not an array');
        }
    }

    history.save(animeChoice.name, episodeChoice.title, episodeChoice.url, videoUrl);
    playVideo(videoUrl);
    setRichPresence(`Watching ${animeChoice.name} - ${episodeChoice.title}`, `Using the ${config.player} player`, Date.now(), 'nekocli', 'NekoNode', 'logo2', 'Active');

    await promptToReturn();
}

async function promptToReturn() {
    await inquirer.prompt({ type: 'input', name: 'return', message: 'Press enter to return to the main menu...' });
}

module.exports = watchAnime;