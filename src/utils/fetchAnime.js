// fetchAnime.js
const axios = require('axios');
const cheerio = require('cheerio');
const loadConfig = require('./configLoader');

const config = loadConfig();

async function fetchAnime(query) {
    const searchUrl = `${config.baseUrl}/search.html?keyword=${encodeURIComponent(query)}`;
    try {
        const response = await axios.get(searchUrl);
        const $ = cheerio.load(response.data);
        const animeList = [];

        $('ul.items li').each((_, element) => {
            const animeName = $(element).find('p.name a').text().trim();
            const animeUrl = $(element).find('p.name a').attr('href');
            animeList.push({
                name: animeName,
                url: `${config.baseUrl}${animeUrl}`
            });
        });

        return animeList;
    } catch (error) {
        console.error('Error fetching anime list:', error.message);
        return [];
    }
}

module.exports = fetchAnime;
