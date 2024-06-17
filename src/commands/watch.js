const inquirer = require('inquirer');
const fetchAnime = require('../utils/fetchAnime');
const fetchEpisodes = require('../utils/fetchEpisodes');
const fetchlink = require('../utils/fetchVideoStreams');

async function watchAnime() {

    console.log('Welcome to the Anime CLI!\n\nI get that the player takes a while to load, But i plan on fixing that soon.');

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
            console.log('No anime found.');
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

        //console.log(`Fetching episodes from: ${animeChoice.url}`);
        // Fetch the list of episodes
        const episodes = await fetchEpisodes(animeChoice.url);

        if (episodes.length === 0) {
            console.log('No episodes found.');
            return;
        }

        // Prompt for episode choice
        const { episodeChoice } = await inquirer.prompt({
            type: 'list',
            name: 'episodeChoice',
            message: 'Select an episode to stream:',
            choices: episodes.map(episode => ({
                name: episode.title,
                value: episode.url
            }))
        });

        //console.log(`Watching episode: ${episodeChoice}`);
        await fetchlink(episodeChoice);
    } catch (error) {
        console.error('Error watching anime:', error.message);
    }
}

module.exports = watchAnime;
