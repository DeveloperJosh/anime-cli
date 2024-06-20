import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { join } from 'path';
import { homedir } from 'os';

function loadConfig() {
    let config;
    const isWindows = process.platform === 'win32';
    const configDir = isWindows
        ? join(process.env.APPDATA, 'anime-cli')
        : join(homedir(), '.anime-cli');
    const configFile = join(configDir, 'config.yml');

    try {
        const configFileContent = readFileSync(configFile, 'utf8');
        config = load(configFileContent);
    } catch (e) {
        console.error('Failed to load config file:', e.message);
        console.log('Creating a default config file...\nRun the command again\n');
        
        if (!existsSync(configDir)) {
            mkdirSync(configDir, { recursive: true });
        }
        
        // Create a default config file
        writeFileSync(configFile, `player: mpv # We suggest to use mpv as vlc sometimes doesn't work\nbaseUrl: https://gogoanime3.co\napi: https://api.nekonode.net # DO NOT EDIT\nLang: NA # Set to SUB/DUB if you want to only watch SUB/DUB, Set back to NA for all\n`);
        process.exit(1);
    }
    return config;
}

export default loadConfig;
