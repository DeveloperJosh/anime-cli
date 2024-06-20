const fs = require('node:fs');
const yaml = require('js-yaml');
const path = require('path');
const os = require('os');

function loadConfig() {
    let config;
    const isWindows = process.platform === 'win32';
    const configDir = isWindows
        ? path.join(process.env.APPDATA, 'anime-cli')
        : path.join(os.homedir(), '.anime-cli');
    const configFile = path.join(configDir, 'config.yml');

    try {
        const configFileContent = fs.readFileSync(configFile, 'utf8');
        config = yaml.load(configFileContent);
    } catch (e) {
        console.error('Failed to load config file:', e.message);
        console.log('Creating a default config file...\nRun the command again\n');
        
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        // Create a default config file
        fs.writeFileSync(configFile, `player: mpv # We suggest to use mpv as vlc sometimes doesn't work\nbaseUrl: https://gogoanime3.co\napi: https://api-anime.sziwyz.easypanel.host # DO NOT EDIT\nLang: NA # Set to SUB/DUB if you want to only watch SUB/DUB, Set back to NA for all\n`);
        process.exit(1);
    }
    return config;
}

module.exports = loadConfig;
