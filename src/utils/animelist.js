import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { load, dump } from 'js-yaml';
import { join, dirname } from 'path';
import { homedir } from 'os';

class AnimeList {
    constructor() {
        const isWindows = process.platform === 'win32';
        const configDir = isWindows
            ? join(process.env.APPDATA, 'anime-cli')
            : join(homedir(), '.anime-cli');
        
        this.animeListFilePath = join(configDir, 'animeList.yml');
        this.animeList = this.loadAnimeList();
    }

    loadAnimeList() {
        try {
            if (existsSync(this.animeListFilePath)) {
                const animeListFile = readFileSync(this.animeListFilePath, 'utf8');
                const loadedList = load(animeListFile) || {};
                return loadedList;
            } else {
                this.createAnimeListFile();
                return {};
            }
        } catch (error) {
            console.error(`Failed to load anime list: ${error.message}`);
            return {};
        }
    }

    createAnimeListFile() {
        try {
            const animeListDir = dirname(this.animeListFilePath);
            if (!existsSync(animeListDir)) {
                mkdirSync(animeListDir, { recursive: true });
            }
            writeFileSync(this.animeListFilePath, '');
        } catch (error) {
            console.error(`Failed to create anime list file: ${error.message}`);
        }
    }

    save(animeName, episode, link) {
        if (!this.animeList[animeName]) {
            this.animeList[animeName] = [];
        }

        const episodeExists = this.animeList[animeName].some(ep => ep.episode === episode);
        if (episodeExists) {
            return;
        }
        this.animeList[animeName].push({ episode, link });
        this.saveAnimeList();
    }

    remove(animeName) {
        delete this.animeList[animeName];
        this.saveAnimeList();
    }

    removeEpisode(animeName, episode) {
        if (!this.animeList[animeName]) {
            return;
        }

        this.animeList[animeName] = this.animeList[animeName].filter(ep => ep.episode !== episode);
        this.saveAnimeList();
    }

    saveAnimeList() {
        try {
            const yamlStr = dump(this.animeList, {
                noRefs: true,
                flowLevel: 2,
                styles: { '!!null': 'null' }
            });
            writeFileSync(this.animeListFilePath, yamlStr);
        } catch (error) {
            console.error(`Failed to save anime list: ${error.message}`);
        }
    }

    getAnimeList() {
        return this.animeList;
    }

    getAnimeEpisodes(animeName) {
        return this.animeList[animeName] || [];
    }

    clearAnimeList() {
        this.animeList = {};
        this.saveAnimeList();
    }

    showAnimeNames() {
        return Object.keys(this.animeList);
    }
}

export default AnimeList;
