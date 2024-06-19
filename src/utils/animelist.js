const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

class AnimeList {
    constructor() {
        this.animeListFilePath = path.join(process.env.APPDATA, 'anime-cli', 'animeList.yml');
        this.animeList = this.loadAnimeList();
    }

    loadAnimeList() {
        try {
            if (fs.existsSync(this.animeListFilePath)) {
                const animeListFile = fs.readFileSync(this.animeListFilePath, 'utf8');
                const loadedList = yaml.load(animeListFile) || {};
                //console.log('Loaded Anime List:', loadedList); // Debugging output
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

        // Check if the episode already exists in the list
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
            //console.log('Saving Anime List:', this.animeList); // Debugging output
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
       // console.log('Current Anime List Structure:', this.animeList); // Debugging output
        return Object.keys(this.animeList);
    }
}

module.exports = AnimeList;
