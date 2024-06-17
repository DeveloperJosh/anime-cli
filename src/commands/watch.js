const inquirer = require('inquirer');
const fetchAnime = require('../utils/fetchAnime');
const fetchEpisodes = require('../utils/fetchEpisodes');
const axios = require('axios');
const cheerio = require('cheerio');
const History = require('../utils/history');
const { playVideo, sendMpvCommand } = require('../utils/player');
const parseScriptTags = require('../utils/parser');
const { exec } = require('child_process');
const configLoader = require('../utils/configLoader');

const config = configLoader();
const history = new History();

async function watchAnime() {
    console.log('Welcome to the Anime CLI!\n\nI get that the player takes a while to load, But I plan on fixing that soon.');

    exec('mpv --version', (error, stdout, stderr) => {
        if (error) {
            console.error('MPV player is required to watch anime. Please install it first, then try again. You can download it from https://mpv.io/');
            process.exit();
        }
    });

    try {
        const { animeName } = await inquirer.prompt({
            type: 'input',
            name: 'animeName',
            message: 'Enter the name of the anime:'
        });

        const animeList = await fetchAnime(animeName);

        if (animeList.length === 0) {
            console.log('No anime found.');
            process.exit();
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

        const episodeData = await fetchEpisodes(animeChoice.url);

        if (!episodeData || episodeData.episodes.length === 0) {
            console.log('No episodes found.');
            return;
        }

        const { episodes, animeName: fetchedAnimeName } = episodeData;

        const { episodeChoice } = await inquirer.prompt({
            type: 'list',
            name: 'episodeChoice',
            message: `Select an episode from ${fetchedAnimeName}:`,
            choices: episodes.map(episode => ({
                name: episode.title,
                value: episode
            }))
        });

        if (episodeChoice.title === "End of List") {
            console.log('No episodes found.');
            return;
        } 

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
        const episodePageResponse = await axios.get(episodeChoice.url);
        const $ = cheerio.load(episodePageResponse.data);

        if (videoSource === 'mp4upload') {
            videoUrl = $('a[rel="3"]').attr('data-video');
        } else if (videoSource === 'streamwish') {
            const tempUrl = $('a[rel="13"]').attr('data-video');
            videoUrl = await parseScriptTags(tempUrl);
        } else if (videoSource === 'vidhide') {
            const tempUrl = $('a[rel="15"]').attr('data-video');
            videoUrl = await parseScriptTags(tempUrl);
        }

        history.save(animeChoice.name, episodeChoice.title, episodeChoice.url, videoUrl);

        let processHandle = playVideo(videoUrl);

        let playing = true;
        console.clear();
        while (playing) {
            const { menu } = await inquirer.prompt({
                type: 'list',
                name: 'menu',
                message: 'Select an option:',
                choices: [
                    { name: 'Player Info', value: 'info' },
                    { name: 'Anime Info', value: 'anime'},
                    { name: 'Next Episode', value: 'next' },
                ]
            });

            if (menu === 'info') {
                console.clear();
                console.log(`Anime Name: ${animeChoice.name}`);
                console.log(`Episode: ${episodeChoice.title}`);
                console.log(`Player: ${config.player}`);
                console.log(`Episode URL: ${episodeChoice.url}`);
                console.log(`Video URL: ${videoUrl}`);

                await inquirer.prompt({
                    type: 'input',
                    name: 'continue',
                    message: 'Press Enter to continue...'
                });
                console.clear();
            } else if (menu === 'next') {
                playing = false;
                sendMpvCommand('quit');

                const nextEpisodeIndex = episodes.findIndex(episode => episode.title === episodeChoice.title) + 1;
                const nextEpisode = episodes[nextEpisodeIndex];

                if (nextEpisode) {
                    const nextEpisodePageResponse = await axios.get(nextEpisode.url);
                    const $next = cheerio.load(nextEpisodePageResponse.data);

                    if (videoSource === 'mp4upload') {
                        videoUrl = $next('a[rel="3"]').attr('data-video');
                    } else if (videoSource === 'streamwish') {
                        const tempUrl = $next('a[rel="13"]').attr('data-video');
                        videoUrl = await parseScriptTags(tempUrl);
                    } else if (videoSource === 'vidhide') {
                        const tempUrl = $next('a[rel="15"]').attr('data-video');
                        videoUrl = await parseScriptTags(tempUrl);
                    }

                    history.save(animeChoice.name, nextEpisode.title, nextEpisode.url, videoUrl);
                    processHandle = playVideo(videoUrl);
                    playing = true;
                }
            } else if (menu === 'anime') {
                console.clear();
                console.log("Not Supported Yet")

                await inquirer.prompt({
                    type: 'input',
                    name: 'continue',
                    message: 'Press Enter to continue...'
                });
                console.clear();
            }
        }
    } catch (error) {
        console.error('Error watching anime:', error.message);
    }
}

module.exports = watchAnime;
