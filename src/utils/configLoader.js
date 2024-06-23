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

    // Default configuration
    const defaultConfigContent = `player: mpv # We suggest to use mpv as vlc sometimes doesn't work\nbaseUrl: https://gogoanime3.co\napi: https://nekonode-api.sziwyz.easypanel.host # DO NOT EDIT\nLang: NA # Set to SUB/DUB if you want to only watch SUB/DUB, Set back to NA for all\n`;

    if (!existsSync(configFile)) {
        console.log('Config file not found, creating a default config file...');

        if (!existsSync(configDir)) {
            mkdirSync(configDir, { recursive: true });
        }

        writeFileSync(configFile, defaultConfigContent);

        console.log('Default config file created at', configFile);
        config = load(defaultConfigContent);
    } else {
        try {
            const configFileContent = readFileSync(configFile, 'utf8');
            config = load(configFileContent);
        } catch (e) {
            console.error('Failed to load config file:', e.message);
            console.log('Using default configuration settings.');

            config = load(defaultConfigContent);
        }
    }

    return config;
}

export default loadConfig;
