// I will soon integrate this into the watch command so user can add the show and ep the're watching to the list.
const AnimeList = require('../utils/animelist');
const inquirer = require('inquirer');
const ora = require('ora');
const configLoader = require('../utils/configLoader');

const config = configLoader();
const animeList = new AnimeList();

async function listAnime() {
    console.clear();
    console.log('Welcome to the NekoNode List Manager!');
    const spinner = ora('Loading anime list').start();
    const animeListNames = animeList.showAnimeNames();
    spinner.stop();

    const { animeListName } = await inquirer.prompt({
        type: 'list',
        name: 'animeListName',
        message: 'Select an anime:',
        choices: ['Get', 'Add', 'Remove', 'Exit']
    });

    if (animeListName === 'Exit') {
        console.log('Exiting...');
        process.exit(0);
    } else if (animeListName === 'Get') {

        if (animeListNames.length === 0) {
            console.log('No anime found.');
            process.exit();
        }

        const { animeName } = await inquirer.prompt({
            type: 'list',
            name: 'animeName',
            message: 'Select an anime:',
            choices: [...animeListNames, 'Exit']
        });

        if (animeName === 'Exit') {
            console.log('Exiting...');
            process.exit(0);
        } else {
            // Get the episodes for the selected anime
            const animeEpisodes = animeList.getAnimeEpisodes(animeName);

            // If there are no episodes, show a message and exit
            if (animeEpisodes.length === 0) {
                console.log('No episodes found for this anime.');
                process.exit();
            }

            // Display the episodes
            console.log(`Episodes for ${animeName}:`);
            animeEpisodes.forEach(episode => {
                console.log(`Episode ${episode.episode}: ${episode.link}`);
            });
            process.exit();
        }


    } else if (animeListName === 'Add') {
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
            },
        ]);

        // make name like the-new-anime
        const animeNameSlug = animeName.toLowerCase().replace(/\s/g, '-');
        const animeUrl = `${config.baseUrl}/${animeNameSlug}-episode-${episodeNumber}`;

        animeList.save(animeName, `EP ${episodeNumber}`, `${animeUrl}`);
        console.log('Anime episode added.');
        process.exit();
    } else if (animeListName === 'Remove') {
        // ask if they want to remove all episodes or a specific episode or the anime
        const { removeType } = await inquirer.prompt({
            type: 'list',
            name: 'removeType',
            message: 'Select an option:',
            choices: ['Specific episode', 'Remove anime', 'Exit']
        });

        if (removeType === 'Specific episode') {

            if (animeListNames.length === 0) {
                console.log('No anime found.');
                process.exit();
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
                process.exit();
            }

            const { episodeNumber } = await inquirer.prompt({
                type: 'list',
                name: 'episodeNumber',
                message: 'Select an episode to remove:',
                choices: animeEpisodes.map(episode => episode.episode)
            });
            animeList.removeEpisode(animeName, episodeNumber);
            console.log('Anime episode removed.');
            process.exit();
        } else if (removeType === 'Remove anime') {

            if (animeListNames.length === 0) {
                console.log('No anime found.');
                process.exit();
            }

            const { animeName } = await inquirer.prompt({
                type: 'list',
                name: 'animeName',
                message: 'Select an anime:',
                choices: animeListNames
            });
            animeList.remove(animeName);
            console.log('Anime removed.');
            process.exit();
        } else if (removeType === 'Exit') {
            console.log('Exiting...');
            process.exit();
        }
        process.exit();
    }
}

module.exports = listAnime;