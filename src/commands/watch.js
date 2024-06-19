const inquirer = require('inquirer');
const chalk = require('chalk');
const axios = require('axios');
const Table = require('cli-table3');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const fetchAnime = require('../utils/fetchAnime');
const fetchEpisodes = require('../utils/fetchEpisodes');
const History = require('../utils/history');
const playVideo = require('../utils/player');
const configLoader = require('../utils/configLoader');
const AnimeList = require('../utils/animelist');
const convertUrlToMp4 = require('../utils/downloader');
const setRichPresence = require('../utils/discord');

const config = configLoader();
const history = new History();
const animeList = new AnimeList();

let currentAnime = null;
let currentEpisode = null;

async function watchAnime() {
    console.clear();
    console.log('Welcome to the NekoNode!');
    
    // check config for player and then check if it is installed
    exec(`${config.player} --version`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${config.player} is not installed. Please install ${config.player} and try again.`);
            process.exit(1);
        }
    });

    await displayMenu();
}

async function displayMenu() {
    while (true) {
        const { action } = await inquirer.prompt({
            type: 'list',
            name: 'action',
            message: 'Select an option:',
            choices: ['Search', 'View History', 'Exit']
        });

        if (action === 'Search') {
            await selectAnime();
        } else if (action === 'View History') {
            await viewHistory();
        } else if (action === 'Exit') {
            console.log('Exiting...');
            process.exit(0);
        }
    }
}

async function viewHistory() {
    const historyList = history.getHistory();
    if (historyList.length === 0) {
        console.log(chalk.yellow('No history found.'));
        await promptReturnToMenu();
        return;
    }

    console.info(chalk.blue.bold('\nHistory:'));
    const table = new Table({
        head: [chalk.bold('Anime Name'), chalk.bold('Episode'), chalk.bold('Link')],
        colWidths: [30, 10, 50],
        style: { head: ['cyan'], border: ['grey'] }
    });

    historyList.forEach(item => {
        table.push([item.animeName, item.episode, item.link]);
    });

    console.log(table.toString());
    console.info(chalk.blue('\nEnd of History\n'));

    await promptReturnToMenu();
}

async function selectAnime() {
    try {
        const { animeName } = await inquirer.prompt({
            type: 'input',
            name: 'animeName',
            message: 'Enter the name of the anime:'
        });

        const animeResults = await fetchAnime(animeName);
        if (animeResults.length === 0) {
            console.log('No anime found.');
            await promptReturnToMenu();
            return;
        }

        const { animeChoice } = await inquirer.prompt({
            type: 'list',
            name: 'animeChoice',
            message: 'Select an anime:',
            choices: animeResults.map(anime => ({ name: anime.name, value: anime }))
        });

        currentAnime = animeChoice;
        await selectEpisode();
    } catch (error) {
        console.error('Error selecting anime:', error.message);
    }
}

async function selectEpisode() {
    try {
        const episodeData = await fetchEpisodes(currentAnime.url);
        if (!episodeData || episodeData.episodes.length === 0) {
            console.log('No episodes found.');
            await promptReturnToMenu();
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
            params: { server: 'gogocdn' }
        });

        const videoUrl = findVideoUrl(response.data.sources);
        if (!videoUrl) {
            console.log('No video URL found for the selected episode.');
            await promptReturnToMenu();
            return;
        }

        history.save(currentAnime.name, episodeChoice.title, episodeChoice.url, videoUrl);
        playVideo(videoUrl, currentAnime.name, episodeChoice.title);

        currentEpisode = episodeChoice;
        setRichPresence(
            `Watching ${currentAnime.name} - ${currentEpisode.title}`,
            `Using the ${config.player} player`,
            Date.now(),
            'nekocli',
            'NekoNode',
            'logo2',
            'Active'
        );

        await episodeMenu(episodeId);
    } catch (error) {
        console.error('Error fetching episodes:', error.message);
    }
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

    const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'Select an option:',
        choices: [
            'Anime Info', 
            'Download', 
            'Save Episode', 
            'Next Episode', 
            'Previous Episode', 
            'Return to main menu'
        ]
    });

    switch (action) {
        case 'Next Episode':
            await navigateEpisode(currentEpisodeId, 1);
            break;
        case 'Previous Episode':
            await navigateEpisode(currentEpisodeId, -1);
            break;
        case 'Download':
            await downloadEpisode(currentEpisodeId);
            break;
        case 'Save Episode':
            const episodeNumber = currentEpisode.title.match(/\d+/)[0];
            animeList.save(currentAnime.name, episodeNumber, currentEpisode.url);
            console.log('Episode saved to anime list.');
            await promptReturnToMenu();
            await episodeMenu(currentEpisodeId);
            break;
        case 'Anime Info':
            await showAnimeInfo(currentEpisodeId); // Pass currentEpisodeId
            break;
        case 'Return to main menu':
            await displayMenu();
            break;
    }

    await episodeMenu(currentEpisodeId);
}

async function navigateEpisode(currentEpisodeId, direction) {
    try {
        const basePart = currentEpisodeId.substring(0, currentEpisodeId.lastIndexOf('-') + 1);
        let episodeNumber = parseInt(currentEpisodeId.split('-').pop()) + direction;
        const nextEpisodeId = `${basePart}${episodeNumber}`;

        const response = await axios.get(`${config.api}/anime/gogoanime/watch/${nextEpisodeId}`, {
            params: { server: 'gogocdn' }
        });

        const videoUrl = findVideoUrl(response.data.sources);
        if (!videoUrl) {
            console.log('No more episodes found.');
            await promptReturnToMenu();
            return;
        }

        const link = `${config.baseUrl}/${currentAnime.name.replace(/\s/g, '-').toLowerCase()}-episode-${episodeNumber}`;
        history.save(currentAnime.name, `EP ${episodeNumber}`, link, videoUrl);
        playVideo(videoUrl, currentAnime.name, `Episode ${episodeNumber}`);
        setRichPresence(
            `Watching ${currentAnime.name} - Episode ${episodeNumber}`,
            `Using the ${config.player} player`,
            Date.now(),
            'nekocli',
            'NekoNode',
            'logo2',
            'Active'
        );

        await episodeMenu(nextEpisodeId);
    } catch (error) {
        console.error('Error navigating episodes:', error.message);
    }
}

async function downloadEpisode(currentEpisodeId) {
    try {
        const response = await axios.get(`${config.api}/anime/gogoanime/watch/${currentEpisodeId}`, {
            params: { server: 'gogocdn' }
        });

        const videoUrl = findVideoUrl(response.data.sources);
        if (!videoUrl) {
            console.log('No video found.');
            await promptReturnToMenu();
            return;
        }

        const videosPath = path.join(os.homedir(), 'Videos');
        const animePath = path.join(videosPath, currentAnime.name);
        const outputFilePath = path.join(animePath, `${currentAnime.name} - ${currentEpisode.title}.mp4`);

        if (!fs.existsSync(animePath)) {
            fs.mkdirSync(animePath, { recursive: true });
        }

        await convertUrlToMp4(videoUrl, outputFilePath);
        console.log(`Downloaded to ${outputFilePath}`);
        await promptReturnToMenu();
        await episodeMenu(currentEpisodeId);
    } catch (error) {
        console.error('Error downloading episode:', error.message);
    }
}

async function showAnimeInfo(currentEpisodeId) {
    try {
        const animeNameSlug = currentAnime.name.toLowerCase().replace(/\s|:/g, '-').replace('-(dub)', '');
        const url = `${config.api}/anime/gogoanime/info/${animeNameSlug}`;
        const response = await axios.get(url);
        const animeInfo = response.data;

        console.log(`Title: ${animeInfo.title}
Total Episodes: ${animeInfo.totalEpisodes}
Genres: ${animeInfo.genres.join(', ')}
Status: ${animeInfo.status}
Release Date: ${animeInfo.releaseDate}
Type: ${animeInfo.type}
Description: ${animeInfo.description}`);

        await promptReturnToMenu();
        await episodeMenu(currentEpisodeId); // Use the parameter currentEpisodeId
    } catch (error) {
        console.error('Error fetching anime info:', error.message);
    }
}

async function promptReturnToMenu() {
    await inquirer.prompt({
        type: 'input',
        name: 'back',
        message: 'Hit enter to go back'
        // lock so no other input can be entered

    });
    console.clear();
}

module.exports = watchAnime;
