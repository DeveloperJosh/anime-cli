const fs = require('node:fs');
const yaml = require('js-yaml');
const path = require('path');
const os = require('os');

class AnimeList {
    constructor() {
        const isWindows = process.platform === 'win32';
        const configDir = isWindows
            ? path.join(process.env.APPDATA, 'anime-cli')
            : path.join(os.homedir(), '.anime-cli');
        
        this.animeListFilePath = path.join(configDir, 'animeList.yml');
        this.animeList = this.loadAnimeList();
    }

    loadAnimeList() {
        try {
            if (fs.existsSync(this.animeListFilePath)) {
                const animeListFile = fs.readFileSync(this.animeListFilePath, 'utf8');
                const loadedList = yaml.load(animeListFile) || {};
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
            const animeListDir = path.dirname(this.animeListFilePath);
            if (!fs.existsSync(animeListDir)) {
                fs.mkdirSync(animeListDir, { recursive: true });
            }
            fs.writeFileSync(this.animeListFilePath, '');
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
            const yamlStr = yaml.dump(this.animeList, {
                noRefs: true,
                flowLevel: 2,
                styles: { '!!null': 'null' }
            });
            fs.writeFileSync(this.animeListFilePath, yamlStr);
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

module.exports = AnimeList;
