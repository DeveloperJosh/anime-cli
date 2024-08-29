import AnimeList from '../utils/animelist.js';
import inquirer from 'inquirer';
import chalk from 'chalk'; 
import ora from 'ora';
import configLoader from '../utils/configLoader.js';

const config = configLoader();
const animeList = new AnimeList();

async function listAnime() {
    console.clear();
    console.log(chalk.bgBlueBright('NekoNode List Manager'));

    const spinner = ora('Loading anime list').start();
    const animeListNames = animeList.showAnimeNames();
    spinner.stop();

    const { animeListName } = await inquirer.prompt({
        type: 'list',
        name: 'animeListName',
        message: 'Select an option:',
        choices: ['View list', 'Add to list', 'Remove from list', 'Exit']
    });

    switch (animeListName) {
        case 'Exit':
            console.log('Exiting...');
            process.exit(0);
        case 'View list':
            await handleGetAnime(animeListNames);
            break;
        case 'Add to list':
            await handleAddAnime();
            break;
        case 'Remove from list':
            await handleRemoveAnime(animeListNames);
            break;
    }
    await backtoMenu();
}

async function handleGetAnime(animeListNames) {
    if (animeListNames.length === 0) {
        console.log('No anime found.');
        return;
    }

    const { animeName } = await inquirer.prompt({
        type: 'list',
        name: 'animeName',
        message: 'Select an anime:',
        choices: [...animeListNames, 'Exit']
    });

    if (animeName === 'Exit') {
        console.log('Exiting...');
        console.clear();
        process.exit(0);
    } else {
        const animeEpisodes = animeList.getAnimeEpisodes(animeName);
        if (animeEpisodes.length === 0) {
            console.log('No episodes found for this anime.');
            return;
        }

        console.log(`Episodes for ${animeName}:`);
        animeEpisodes.forEach(episode => {
            console.log(`Episode ${episode.episode}: ${episode.link}`);
        });
    }
}

async function handleAddAnime() {
    const { animeName, episodeNumber } = await inquirer.prompt([
        {
            type: 'input',
            name: 'animeName',
            message: 'Enter the name of the anime:'
        },
        {
            type: 'input',
            name: 'episodeNumber',
            message: 'Enter the episode number:',
            validate: value => {
                if (isNaN(value)) {
                    return 'Please enter a valid episode number.';
                }
                return true;
            }
        }
    ]);

    const animeNameSlug = animeName.toLowerCase().replace(/\s/g, '-');
    const animeUrl = `${config.baseUrl}/${animeNameSlug}-episode-${episodeNumber}`;

    animeList.save(animeName, `EP ${episodeNumber}`, `${animeUrl}`);
    console.log('Anime episode added.');
}

async function handleRemoveAnime(animeListNames) {
    const { removeType } = await inquirer.prompt({
        type: 'list',
        name: 'removeType',
        message: 'Select an option:',
        choices: ['Specific episode', 'Remove anime', 'Exit']
    });

    if (removeType === 'Specific episode') {
        if (animeListNames.length === 0) {
            console.log('No anime found.');
            return;
        }

        const { animeName } = await inquirer.prompt({
            type: 'list',
            name: 'animeName',
            message: 'Select an anime:',
            choices: animeListNames
        });

        const animeEpisodes = animeList.getAnimeEpisodes(animeName);
        if (animeEpisodes.length === 0) {
            console.log('No episodes found for this anime.');
            return;
        }

        const { episodeNumber } = await inquirer.prompt({
            type: 'list',
            name: 'episodeNumber',
            message: 'Select an episode to remove:',
            choices: animeEpisodes.map(episode => episode.episode)
        });
        animeList.removeEpisode(animeName, episodeNumber);
        console.log('Anime episode removed.');
    } else if (removeType === 'Remove anime') {
        if (animeListNames.length === 0) {
            console.log('No anime found.');
            return;
        }

        const { animeName } = await inquirer.prompt({
            type: 'list',
            name: 'animeName',
            message: 'Select an anime:',
            choices: animeListNames
        });
        animeList.remove(animeName);
        console.log('Anime removed.');
    } else {
        console.log('Exiting...');
        process.exit(0);
    }
}

async function backtoMenu() {
    // Add a simple input prompt to return to the menu
    await inquirer.prompt({
        type: 'input',
        name: 'back',
        message: 'Press Enter to return to the menu...'
    });
    await listAnime();
}

export default listAnime;