const originalEmitWarning = process.emitWarning;

process.emitWarning = (warning, ...args) => {
  if (typeof warning === 'string' && warning.startsWith('DeprecationWarning')) {
    // Suppress specific deprecation warnings
    return;
  }
  originalEmitWarning(warning, ...args);
};


import inquirer from 'inquirer';
// color console output
import chalk from 'chalk';
import readline from 'node:readline';
import axios from 'axios';
import Table from 'cli-table3';
import { exec } from 'child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

import fetchAnime from '../utils/fetchAnime.js';
import fetchEpisodes from '../utils/fetchEpisodes.js';
import History from '../utils/history.js';
import playVideo from '../utils/player.js';
import configLoader from '../utils/configLoader.js';
import AnimeList from '../utils/animelist.js';
import convertUrlToMp4 from '../utils/downloader.js';
import listAnime from './list.js';
import fetchNewestAnime from './new.js';
import setRichPresence from '../utils/discord.js';

const config = configLoader();
const history = new History();
const animeList = new AnimeList();

let currentAnime = null;
let currentEpisode = null;

async function watchAnime() {
    console.clear();
    // add a background color to the console
    console.log(chalk.bgBlueBright('Welcome to NekoNode Watcher!'));

    // Check config for player and then check if it is installed
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
            choices: ['Search', 'Help', 'View History', 'List Manager', 'New Anime', 'Exit']
        });

        if (action === 'Search') {
            await selectAnime();
        } else if (action === 'Help') {
            console.clear();
            console.log(chalk.bgBlueBright('Help Menu:')); 
            console.log('Search: Search for an anime to watch');
            console.log('Help: Display this help menu');
            console.log('View History: View the history of watched episodes');
            console.log('List Manager: Manage your anime list (This is separate from the history and this menu)');
            console.log('New Anime: Fetch the newest anime releases');
            console.log('Exit: Exit the program');
            await promptReturnToMenu();
        } else if (action === 'New Anime') {
            await fetchNewestAnime();
        } else if (action === 'List Manager') {
            await listAnime();
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
        console.log('No history found.');
        await promptReturnToMenu();
        return;
    }

    console.info('\nHistory:');
    const table = new Table({
        head: ['Anime Name', 'Episode', 'Link'],
        colWidths: [30, 10, 50],
        style: { head: ['cyan'], border: ['grey'] }
    });

    historyList.forEach(item => {
        table.push([item.animeName, item.episode, item.link]);
    });

    console.log(table.toString());
    console.info('\nEnd of History\n');

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
    //console.log(`Current Anime: ${currentAnime.name}`);
    console.log(chalk.bgBlueBright(`Current Episode: ${currentAnime.name}`));
    if (!currentEpisodeId) {
        console.log('Error: No episode ID provided.');
        return;
    }

    const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'Select an option:',
        choices: [
            'Next Episode',
            'Previous Episode',
            'Reply Episode',
            'Anime Info',
            'Download',
            'Save To List',
            'Return to main menu'
        ]
    });

    switch (action) {
        case 'Next Episode':
            await navigateEpisode(currentEpisodeId, 1);
            currentEpisodeId += 1;
            break;
        case 'Reply Episode':
            await navigateEpisode(currentEpisodeId, 0);
            break;
        case 'Previous Episode':
            await navigateEpisode(currentEpisodeId, -1);
            currentEpisodeId -= 1;
            break;
        case 'Download':
            await downloadEpisode(currentEpisodeId);
            break;
        case 'Save To List':
            let episodeNumber = parseInt(currentEpisodeId.split('-').pop());
            episodeNumber = episodeNumber.toString();
            //update currentEpisode.url to have the episode number
            currentEpisode.url = `${config.baseUrl}/${currentAnime.name.replace(/\s/g, '-').toLowerCase()}-episode-${episodeNumber}`;
            animeList.save(currentAnime.name, episodeNumber, currentEpisode.url);
            console.log('Episode saved to anime list.');
            await promptReturnToMenu();
            await episodeMenu(currentEpisodeId);
            break;
        case 'Anime Info':
            console.clear();
            let name = currentAnime.name;
            let animeNameSlug = name.toLowerCase().replace(/\s/g, '-');
            if (animeNameSlug.includes(':')) {
                animeNameSlug = animeNameSlug.replace(':', '');
            }
            if (animeNameSlug.includes('-(dub)')) {
                animeNameSlug = animeNameSlug.replace('-(dub)', '');
            }
            const infoUrl = `${config.api}/anime/gogoanime/info/${animeNameSlug}`;
            const infoResponse = await axios.get(infoUrl);
            let animeInfo = infoResponse.data;
            let text = `Title: ${animeInfo.title}\nTotal Episodes: ${animeInfo.totalEpisodes}\nGenres: ${animeInfo.genres.join(', ')}\nStatus: ${animeInfo.status}\nRelease Date: ${animeInfo.releaseDate}\nType: ${animeInfo.type}\nDescription: ${animeInfo.description}`;
            console.log(text);
            await promptReturnToMenu();
            await episodeMenu(currentEpisodeId);
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

const sanitizeFileName = (name) => {
    return name.replace(/[:<>?"|*\/\\]/g, '_');
};

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

        const { confirmDownload } = await inquirer.prompt({
            type: 'confirm',
            name: 'confirmDownload',
            message: 'Do you want to download this episode?'
        });

        if (!confirmDownload) {
            console.log('Download cancelled.');
            await promptReturnToMenu();
            return;
        }
        console.clear();

        const sanitizedAnimeName = sanitizeFileName(currentAnime.name);

        const videosPath = join(homedir(), 'Videos');
        const animePath = join(videosPath, sanitizedAnimeName);
        const outputFilePath = join(animePath, `${sanitizedAnimeName} - ${sanitizeFileName(currentEpisode.title)}.mp4`);
        if (!existsSync(videosPath)) {
            mkdirSync(videosPath, { recursive: true });
            console.log('Created directory:', videosPath);
        }

        if (!existsSync(animePath)) {
            mkdirSync(animePath, { recursive: true });
            console.log(`Created directory: ${animePath}`);
        }
        await convertUrlToMp4(videoUrl, outputFilePath);

        console.log(`Episode saved to: ${outputFilePath}`);
        await promptReturnToMenu();
        await episodeMenu(currentEpisodeId);

    } catch (error) {
        console.error('Error encountered:', error.message);
        console.error('Full error details:', error);
    }
}

async function promptReturnToMenu() {
    await inquirer.prompt({
        type: 'input',
        name: 'back',
        message: 'Hit enter to go back'
    });

    console.clear();
    console.log(chalk.bgBlueBright('Welcome to NekoNode Watcher!'));
}

export default watchAnime;
