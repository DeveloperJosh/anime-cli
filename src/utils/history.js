const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

class History {
    constructor() {
        this.historyFilePath = path.join(process.env.APPDATA, 'anime-cli', 'history.yml');
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
            // Use yaml.dump with custom options to get JSON-like output
            const yamlStr = yaml.dump(this.history, {
                noRefs: true,
                flowLevel: 2, // Control the nesting level for which block style will be used
                styles: { '!!null': 'null' } // Optional: Ensure null values are explicitly defined
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
