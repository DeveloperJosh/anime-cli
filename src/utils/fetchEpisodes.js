const axios = require('axios');
const cheerio = require('cheerio');
const ora = require('ora');

const fetchEpisodes = async (animeUrl) => {
    const spinner = ora('Fetching episodes...').start();
    try {
        // Fetch the HTML content of the anime page
        const response = await axios.get(animeUrl);
        spinner.stop();

        // Load the HTML into cheerio
        const $ = cheerio.load(response.data);

        // Find the total number of episodes
        let totalEpisodes = 0;
        $('#episode_page a').each((i, element) => {
            const end = $(element).attr('ep_end');
            if (end) {
                totalEpisodes = Math.max(totalEpisodes, parseInt(end, 10));
            }
        });

        // If no episodes are found, return a message
        if (totalEpisodes === 0) {
            console.log('No episodes found.');
            return [];
        }

        // Extract the base URL for episodes
        const baseUrl = animeUrl.replace('/category/', '/');

        // Construct the episode URLs
        const episodes = [];
        for (let i = 1; i <= totalEpisodes; i++) {
            const episodeUrl = `${baseUrl}-episode-${i}`;
            episodes.push({
                title: `Episode ${i}`,
                url: episodeUrl,
            });
        }

        // when user gets to the end of the list don't let them go further
        episodes.push({
            title: 'End of List',
            url: 'End of List',
        });

        return episodes;
    } catch (error) {
        spinner.stop();
        console.error('Error fetching episodes:', error);
        return [];
    }
};

module.exports = fetchEpisodes;
