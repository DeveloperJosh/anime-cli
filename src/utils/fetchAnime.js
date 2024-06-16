const axios = require('axios');
const cheerio = require('cheerio');

async function fetchAnime(query) {
    const searchUrl = `https://gogoanime3.co/search.html?keyword=${encodeURIComponent(query)}`;
    
    try {
        const response = await axios.get(searchUrl);
        const $ = cheerio.load(response.data);
        const animeList = [];

        $('ul.items li').each((index, element) => {
            const animeName = $(element).find('p.name a').text();
            const animeUrl = $(element).find('p.name a').attr('href');
            animeList.push({
                name: animeName,
                url: `https://gogoanime3.co${animeUrl}`
            });
        });

        return animeList;
    } catch (error) {
        console.error('Error fetching anime list:', error.message);
        return [];
    }
}

module.exports = fetchAnime;
