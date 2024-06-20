const AnimeList = require('../utils/animelist');
const inquirer = require('inquirer');
const ora = require('ora');
const chalk = require('chalk');
const figlet = require('figlet');
const configLoader = require('../utils/configLoader');
const watchAnime = require('./watch');

const config = configLoader();
const animeList = new AnimeList();

async function listAnime() {
    console.clear();
    console.log(chalk.magenta(figlet.textSync('NekoNode List Manager!')));

    const spinner = ora(chalk.cyan('Loading anime list')).start();
    const animeListNames = animeList.showAnimeNames();
    spinner.stop();

    const { animeListName } = await inquirer.prompt({
        type: 'list',
        name: 'animeListName',
        message: chalk.green('Select an option:'),
        choices: ['Get', 'Add', 'Remove', 'Exit']
    });

    switch (animeListName) {
        case 'Exit':
            console.log(chalk.yellow('Exiting...'));
            process.exit(0);
        case 'Get':
            await handleGetAnime(animeListNames);
            break;
        case 'Add':
            await handleAddAnime();
            break;
        case 'Remove':
            await handleRemoveAnime(animeListNames);
            break;
    }
    await backtoMenu();
}

async function handleGetAnime(animeListNames) {
    if (animeListNames.length === 0) {
        console.log(chalk.red('No anime found.'));
        return;
    }

    const { animeName } = await inquirer.prompt({
        type: 'list',
        name: 'animeName',
        message: chalk.green('Select an anime:'),
        choices: [...animeListNames, 'Exit']
    });

    if (animeName === 'Exit') {
        console.log(chalk.yellow('Exiting...'));
        console.clear();
        process.exit(0);
    } else {
        const animeEpisodes = animeList.getAnimeEpisodes(animeName);
        if (animeEpisodes.length === 0) {
            console.log(chalk.red('No episodes found for this anime.'));
            return;
        }

        console.log(chalk.blue(`Episodes for ${animeName}:`));
        animeEpisodes.forEach(episode => {
            console.log(chalk.cyan(`Episode ${episode.episode}: ${episode.link}`));
        });
    }
}

async function handleAddAnime() {
    const { animeName, episodeNumber } = await inquirer.prompt([
        {
            type: 'input',
            name: 'animeName',
            message: chalk.green('Enter the name of the anime:')
        },
        {
            type: 'input',
            name: 'episodeNumber',
            message: chalk.green('Enter the episode number:'),
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
    console.log(chalk.green('Anime episode added.'));
}

async function handleRemoveAnime(animeListNames) {
    const { removeType } = await inquirer.prompt({
        type: 'list',
        name: 'removeType',
        message: chalk.green('Select an option:'),
        choices: ['Specific episode', 'Remove anime', 'Exit']
    });

    if (removeType === 'Specific episode') {
        if (animeListNames.length === 0) {
            console.log(chalk.red('No anime found.'));
            return;
        }

        const { animeName } = await inquirer.prompt({
            type: 'list',
            name: 'animeName',
            message: chalk.green('Select an anime:'),
            choices: animeListNames
        });

        const animeEpisodes = animeList.getAnimeEpisodes(animeName);
        if (animeEpisodes.length === 0) {
            console.log(chalk.red('No episodes found for this anime.'));
            return;
        }

        const { episodeNumber } = await inquirer.prompt({
            type: 'list',
            name: 'episodeNumber',
            message: chalk.green('Select an episode to remove:'),
            choices: animeEpisodes.map(episode => episode.episode)
        });
        animeList.removeEpisode(animeName, episodeNumber);
        console.log(chalk.green('Anime episode removed.'));
    } else if (removeType === 'Remove anime') {
        if (animeListNames.length === 0) {
            console.log(chalk.red('No anime found.'));
            return;
        }

        const { animeName } = await inquirer.prompt({
            type: 'list',
            name: 'animeName',
            message: chalk.green('Select an anime:'),
            choices: animeListNames
        });
        animeList.remove(animeName);
        console.log(chalk.green('Anime removed.'));
    } else {
        console.log(chalk.yellow('Exiting...'));
        process.exit(0);
    }
}

module.exports = listAnime;
