// configLoader.js
const fs = require('fs');
const yaml = require('js-yaml');

function loadConfig() {
    let config;
    try {
        const configFile = fs.readFileSync(`${process.env.APPDATA}/anime-cli/config.yml`, 'utf8');
        config = yaml.load(configFile);
    } catch (e) {
        console.error(`Failed to load configuration: ${e.message}`);
        // Make sure the config appdata folder exists
        if (!fs.existsSync(`${process.env.APPDATA}/anime-cli`)) {
            fs.mkdirSync(`${process.env.APPDATA}/anime-cli`, { recursive: true });
        }
        // Create a default config file
        fs.writeFileSync(`${process.env.APPDATA}/anime-cli/config.yml`, `player: mpv\nbaseUrl: https://gogoanime3.co`);
        process.exit(1);
    }
    return config;
}

module.exports = loadConfig;
