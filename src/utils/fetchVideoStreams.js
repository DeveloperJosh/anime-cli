const axios = require('axios');
const cheerio = require('cheerio');
const playEpisode = require('./player');

async function fetchlink(animeUrl) {
        // Fetch the episode page
        const episodePageResponse = await axios.get(animeUrl);
        const $ = cheerio.load(episodePageResponse.data);

        // Extract the video URL from the appropriate link
        const videoUrl = $('a[rel="13"]').attr('data-video');

        if (videoUrl) {
            // Play the video
            await playEpisode(videoUrl);
        } else {
            console.log('No video found.');
        }
}

module.exports = fetchlink;