const axios = require('axios');
const cheerio = require('cheerio');
const ora = require('ora');

async function fetchEpisodes(animeUrl) {
    const spinner = ora('Fetching episodes...').start();
    try {
        // Fetch the HTML content of the anime page to get the movie ID and anime name
        const response = await axios.get(animeUrl);
        const $ = cheerio.load(response.data);

        // Extract the movie ID
        const movieId = $('input#movie_id').val();
        if (!movieId) {
            spinner.stop();
            console.error('Movie ID not found.');
            return null;
        }
       // console.log('Movie ID:', movieId);

        let name = animeUrl.split('/');
        name = name[name.length - 1].split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const animeName = `${name}` || 'Unknown Anime';

        // Fetch the episode list from the Gogoanime API
        const apiUrl = "https://ajax.gogocdn.net/ajax/load-list-episode";
        const params = {
            ep_start: 0,
            ep_end: 9999,
            id: movieId,
        };
        const apiResponse = await axios.get(apiUrl, { params });
        spinner.stop();

        // Check if API response is valid
        if (!apiResponse.data) {
            console.log('No episodes found.');
            return null;
        }

        // Load the HTML from the API response
        const $api = cheerio.load(apiResponse.data);

        // Extract episodes from the API response
        const episodes = [];
        $api('li').each((i, element) => {
            const episodeUrl = $api(element).find('a').attr('href');
            const episodeTitle = $api(element).find('.name').text().trim();
            const episodeNumberMatch = episodeTitle.match(/Episode (\d+)/);
            const episodeNumber = episodeNumberMatch ? parseInt(episodeNumberMatch[1], 10) : i + 1;

            if (episodeUrl && episodeTitle) {
                episodes.push({
                    episodeNumber: episodeNumber,
                    title: episodeTitle,
                    url: `https://gogoanime3.co${episodeUrl.trim()}`,
                });
            }
        });

        episodes.reverse();

        // Add a marker for the end of the list
        episodes.push({
            episodeNumber: 'N/A',
            title: 'End of List',
            url: 'End of List',
        });

        return {
            animeName,
            movieId,
            episodes
        };
    } catch (error) {
        spinner.stop();
        console.error('Error fetching episodes:', error);
        return null;
    }
};

module.exports = fetchEpisodes;
