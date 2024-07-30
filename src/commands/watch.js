import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
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
    console.log(chalk.bgBlueBright('Welcome to NekoNode Watcher!'));

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

        switch (action) {
            case 'Search':
                await selectAnime();
                break;
            case 'Help':
                displayHelpMenu();
                await promptReturnToMenu();
                break;
            case 'New Anime':
                await fetchNewestAnime();
                await promptReturnToMenu();
                break;
            case 'List Manager':
                await listAnime();
                await promptReturnToMenu();
                break;
            case 'View History':
                await viewHistory();
                await promptReturnToMenu();
                break;
            case 'Exit':
                console.log('Exiting...');
                process.exit(0);
                break;
        }
    }
}

function displayHelpMenu() {
    console.clear();
    console.log(chalk.bgBlueBright('Help Menu:')); 
    console.log('Search: Search for an anime to watch');
    console.log('Help: Display this help menu');
    console.log('View History: View the history of watched episodes');
    console.log('List Manager: Manage your anime list');
    console.log('New Anime: Fetch the newest anime releases');
    console.log('Exit: Exit the program');
}

async function viewHistory() {
    const historyList = history.getHistory();
    if (historyList.length === 0) {
        console.log('No history found.');
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
            return;
        }

        const { episodeChoice } = await inquirer.prompt({
            type: 'list',
            name: 'episodeChoice',
            message: `Select an episode from ${episodeData.animeName}:`,
            choices: episodeData.episodes.map(episode => ({ name: episode.title, value: episode }))
        });

        const episodeId = episodeChoice.url.split('/').pop();
       // const response = await axios.get(`${config.api}/anime/gogoanime/watch/${episodeId}`, {
        //    params: { server: 'gogocdn' }
      //  });
        //fs.writeFileSync('test.json', JSON.stringify(`${config.api}/api/watch/${episodeId}`));
        const response = await axios.get(`${config.api}/api/watch/${episodeId}`);

        //fs.writeFileSync('test.json', JSON.stringify(response.data));
        const videoUrl = findVideoUrl(response.data);
        //fs.writeFileSync('url.json', JSON.stringify(response.data));
        if (!videoUrl) {
            console.log('No video URL found for the selected episode.');
            return;
        }

        history.save(currentAnime.name, episodeChoice.title, episodeChoice.url, videoUrl);

        const spinner = ora('Loading video...').start();
        playVideo(videoUrl, currentAnime.name, episodeChoice.title);
        spinner.stop();

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
    // Find 1080p quality video URL
    const highestQuality = sources.find(source => source.quality === '1080p');
    
    // Find backup quality video URL
    const backupQuality = sources.find(source => source.quality === 'backup');
    
    // Return 1080p URL if available, otherwise return backup URL
    return highestQuality ? highestQuality.source : backupQuality ? backupQuality.source : null;
}

async function episodeMenu(currentEpisodeId) {
    while (true) {
        console.clear();
        console.log(chalk.bgBlueBright(`Current Episode: ${currentAnime.name} - ${currentEpisode.title}`));
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
              ///  'Replay Episode',
                'Choose Episode',
                'Anime Info',
                'Download',
                'Save To List',
                'Return to main menu'
            ]
        });

        switch (action) {
            case 'Next Episode':
                currentEpisodeId = await navigateEpisode(currentEpisodeId, 1);
                break;
          //  case 'Replay Episode':
          //      await navigateEpisode(currentEpisodeId, 0);
          //      break;
            case 'Previous Episode':
                currentEpisodeId = await navigateEpisode(currentEpisodeId, -1);
                break;
            case 'Choose Episode':
                await selectEpisode();
                return; // Exit the episode menu loop
            case 'Download':
                await downloadEpisode(currentEpisodeId);
                break;
            case 'Save To List':
                saveEpisodeToList(currentEpisodeId);
                await promptReturnToMenu();
                break;
            case 'Anime Info':
                await showAnimeInfo(currentAnime.name);
                break;
            case 'Return to main menu':
                return; // Exit the episode menu loop
        }
    }
}

async function navigateEpisode(currentEpisodeId, direction) {
    try {
        const basePart = currentEpisodeId.substring(0, currentEpisodeId.lastIndexOf('-') + 1);
        let episodeNumber = parseInt(currentEpisodeId.split('-').pop()) + direction;
        const nextEpisodeId = `${basePart}${episodeNumber}`;

       // const response = await axios.get(`${config.api}/anime/gogoanime/watch/${nextEpisodeId}`, {
       //     params: { server: 'gogocdn' }
       // });

        const response = await axios.get(`${config.api}/api/watch/${nextEpisodeId}`);

        const videoUrl = findVideoUrl(response.data);
        if (!videoUrl) {
            console.log('No more episodes found.');
            return currentEpisodeId; // Stay on current episode
        }

        const link = `${config.baseUrl}/${currentAnime.name.replace(/\s/g, '-').toLowerCase()}-episode-${episodeNumber}`;
        history.save(currentAnime.name, `EP ${episodeNumber}`, link, videoUrl);
        currentEpisode = { title: `EP ${episodeNumber}`, url: link };
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

        return nextEpisodeId;
    } catch (error) {
        console.error('Error navigating episodes:', error.message);
        return currentEpisodeId; // Stay on current episode
    }
}

async function downloadEpisode(currentEpisodeId) {
    try {
        //const response = await axios.get(`${config.api}/anime/gogoanime/watch/${currentEpisodeId}`, {
        //    params: { server: 'gogocdn' }
       // });
        //console.log(currentEpisodeId);
        const response = await axios.get(`${config.api}/api/watch/${currentEpisodeId}`);

        const videoUrl = findVideoUrl(response.data);
        if (!videoUrl) {
            console.log('No video found.');
            return;
        }

        const { confirmDownload } = await inquirer.prompt({
            type: 'confirm',
            name: 'confirmDownload',
            message: 'Do you want to download this episode?'
        });

        if (!confirmDownload) {
            console.log('Download cancelled.');
            return;
        }
        console.clear();

        const sanitizedAnimeName = sanitizeFileName(currentAnime.name);
        //console.log(`Downloading episode "${currentEpisode.title}" of anime "${currentAnime.name}"...`);

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
        console.log('File:', outputFilePath);
        await promptReturnToMenu();
    } catch (error) {
        console.error('Error encountered:', error.message);
    }
}

function saveEpisodeToList(currentEpisodeId) {
    console.log('Saving episode to list...');
    console.log('Current Episode ID:', currentEpisodeId);

    // Check if currentEpisodeId is valid
    if (!currentEpisodeId) {
        console.error('Invalid episode ID.');
        return;
    }

    let episodeNumber = parseInt(currentEpisodeId.split('-').pop());
    console.log('Parsed Episode Number:', episodeNumber);

    // Check if currentAnime and currentEpisode are set
    if (!currentAnime || !currentAnime.name) {
        console.error('No current anime selected.');
        return;
    }

    if (!currentEpisode || !currentEpisode.title) {
        console.error('No current episode selected.');
        return;
    }

    const episodeUrl = `${config.baseUrl}/${currentAnime.name.replace(/\s/g, '-').toLowerCase()}-episode-${episodeNumber}`;
    console.log('Constructed Episode URL:', episodeUrl);

    // Update the current episode's URL
    currentEpisode.url = episodeUrl;

    try {
        animeList.save(currentAnime.name, episodeNumber.toString(),episodeUrl);
        console.log(`Episode "${currentEpisode.title}" of anime "${currentAnime.name}" saved to anime list.`);
    } catch (error) {
        console.error('Error saving to anime list:', error.message);
    }
}

async function showAnimeInfo(animeName) {
    console.clear();
    // tensei-kizoku,-kantei-skill-de-nariagaru
    // remove , and - from anime name
    let animeNameSlug = animeName.toLowerCase()
    .replace(/\s/g, '-')
    .replace(/:/g, '')
    .replace(/\(dub\)/g, 'dub')
    .replace(/, /g, '-')
    .replace(/,/g, '')
    .replace(/-+$/, '');

    const infoUrl = `${config.api}/api/info/${animeNameSlug}`;    
    //fs.writeFileSync('test.json', JSON.stringify(infoUrl));
    const infoResponse = await axios.get(infoUrl);
    let animeInfo = infoResponse.data;
    let text = `Title: ${animeInfo.title}\nTotal Episodes: ${animeInfo.totalEpisodes}\nGenres: ${animeInfo.genres.join(', ')}\nStatus: ${animeInfo.status}\nRelease Date: ${animeInfo.released}\nDescription: ${animeInfo.description}`;
    console.log(text);
    await promptReturnToMenu();
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

const sanitizeFileName = (name) => {
    return name.replace(/[:<>?"|*\/\\]/g, '_');
};

export default watchAnime;
