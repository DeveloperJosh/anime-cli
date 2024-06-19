// configLoader.js
const fs = require('fs');
const yaml = require('js-yaml');

function loadConfig() {
    let config;
    try {
        const configFile = fs.readFileSync(`${process.env.APPDATA}/anime-cli/config.yml`, 'utf8');
        config = yaml.load(configFile);
    } catch (e) {
        console.error('Failed to load config file:', e.message);
        console.log('Creating a default config file...\nRun the command again\n');
        if (!fs.existsSync(`${process.env.APPDATA}/anime-cli`)) {
            fs.mkdirSync(`${process.env.APPDATA}/anime-cli`, { recursive: true });
        }
        // Create a default config file
        fs.writeFileSync(`${process.env.APPDATA}/anime-cli/config.yml`, `player: mpv # We suggest to use mpv as vlc somettimes doesn't work\nbaseUrl: https://gogoanime3.co\napi: https://api-anime.sziwyz.easypanel.host # DO NOT EDIT\nLang: NA # Set to SUB/DUB if you want to only watch SUB/DUB, Set back to NA for all\n`);
        process.exit(1);
    }
    return config;
}

module.exports = loadConfig;
