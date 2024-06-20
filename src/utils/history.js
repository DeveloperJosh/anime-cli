const fs = require('node:fs');
const yaml = require('js-yaml');
const path = require('path');
const os = require('os');

class History {
    constructor() {
        const isWindows = process.platform === 'win32';
        const configDir = isWindows
            ? path.join(process.env.APPDATA, 'anime-cli')
            : path.join(os.homedir(), '.anime-cli');
        
        this.historyFilePath = path.join(configDir, 'history.yml');
        this.history = this.loadHistory();
    }

    loadHistory() {
        try {
            if (fs.existsSync(this.historyFilePath)) {
                const historyFile = fs.readFileSync(this.historyFilePath, 'utf8');
                return yaml.load(historyFile) || [];
            } else {
                this.createHistoryFile();
                return [];
            }
        } catch (error) {
            console.error(`Failed to load history: ${error.message}`);
            return [];
        }
    }

    createHistoryFile() {
        try {
            const historyDir = path.dirname(this.historyFilePath);
            if (!fs.existsSync(historyDir)) {
                fs.mkdirSync(historyDir, { recursive: true });
            }
            fs.writeFileSync(this.historyFilePath, '');
        } catch (error) {
            console.error(`Failed to create history file: ${error.message}`);
        }
    }

    save(animeName, episode, link, steamLink) {
        this.history.push({ animeName, episode, link, steamLink });
        try {
            const yamlStr = yaml.dump(this.history, {
                noRefs: true,
                flowLevel: 2,
                styles: { '!!null': 'null' }
            });
            fs.writeFileSync(this.historyFilePath, yamlStr);
        } catch (error) {
            console.error(`Failed to save history: ${error.message}`);
        }
    }

    getHistory() {
        return this.history;
    }

    clearHistory() {
        this.history = [];
        try {
            const yamlStr = yaml.dump(this.history, {
                noRefs: true,
                flowLevel: 2,
                styles: { '!!null': 'null' }
            });
            fs.writeFileSync(this.historyFilePath, yamlStr);
        } catch (error) {
            console.error(`Failed to clear history: ${error.message}`);
        }
    }

    exists(link) {
        return this.history.some(entry => entry.link === link);
    }

    get(index) {
        return this.history[index];
    }

    removeEntry(index) {
        if (index >= 0 && index < this.history.length) {
            this.history.splice(index, 1);
            try {
                const yamlStr = yaml.dump(this.history, {
                    noRefs: true,
                    flowLevel: 2,
                    styles: { '!!null': 'null' }
                });
                fs.writeFileSync(this.historyFilePath, yamlStr);
            } catch (error) {
                console.error(`Failed to remove entry from history: ${error.message}`);
            }
        } else {
            console.error('Invalid index for history entry removal');
        }
    }
}

module.exports = History;
