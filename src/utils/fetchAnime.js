const axios = require('axios');
const cheerio = require('cheerio');
const yaml = require('js-yaml');
const fs = require('fs');

// Load YAML configuration
let config;
try {
    const configFile = fs.readFileSync(`${process.env.APPDATA}/anime-cli/config.yml`, 'utf8');
    config = yaml.load(configFile);
} catch (e) {
    console.error(`Failed to load configuration: ${e.message}, create a config.yml file with the required configuration.`);

    // Make sure the config appdata folder exists
    if (!fs.existsSync(`${process.env.APPDATA}/anime-cli`)) {
        fs.mkdirSync(`${process.env.APPDATA}/anime-cli`, { recursive: true });
    }

    // Create a default config file
    fs.writeFileSync(`${process.env.APPDATA}/anime-cli/config.yml`, `player: mpv`);
    // add base url to the config file
    fs.appendFileSync(`${process.env.APPDATA}/anime-cli/config.yml`, '\nbaseUrl: https://gogoanime3.co');

    process.exit(1);
}

// Function to fetch anime based on a search query
async function fetchAnime(query) {
    const searchUrl = `${config.baseUrl}/search.html?keyword=${encodeURIComponent(query)}`;
    //console.log(`Fetching URL: ${searchUrl}`);
    try {
        const response = await axios.get(searchUrl);
        const $ = cheerio.load(response.data);
        const animeList = [];

        // Parse the search results and extract anime details
        $('ul.items li').each((index, element) => {
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
