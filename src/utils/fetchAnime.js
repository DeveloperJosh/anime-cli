const axios = require('axios');
const cheerio = require('cheerio');
const loadConfig = require('./configLoader');

const config = loadConfig();

async function fetchAnime(query) {
    const animeList = [];
   // console.log(config);

    try {
        let searchUrl;
        if (config.Lang == 'NA') {
            searchUrl = `${config.baseUrl}/search.html?keyword=${encodeURIComponent(query)}`;
        } else {
            const Lang_Type = ['sub', 'dub'];
            const langParam = config.Lang === 'SUB' ? Lang_Type[0] : Lang_Type[1];
            searchUrl = `${config.baseUrl}/filter.html?keyword=${encodeURIComponent(query)}&language%5B%5D=${langParam}&sort=title_az`;
        }

        //console.log('Search URL:', searchUrl);

        const response = await axios.get(searchUrl);
        const $ = cheerio.load(response.data);

        $('ul.items li').each((_, element) => {
            const animeName = $(element).find('p.name a').text().trim();
            const animeUrl = $(element).find('p.name a').attr('href');
            if (animeName && animeUrl) {
                animeList.push({
                    name: animeName,
                    url: `${config.baseUrl}${animeUrl}`
                });
            }
        });

        // Debugging output
        //console.log('Anime list:', animeList);

        return animeList.length ? animeList : [];
    } catch (error) {
        console.error('Error fetching anime list:', error.message);
        return [];
    }
}

module.exports = fetchAnime;
