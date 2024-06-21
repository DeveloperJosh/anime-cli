import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { load, dump } from 'js-yaml';
import { join, dirname } from 'path';
import { homedir } from 'os';

class History {
    constructor() {
        const isWindows = process.platform === 'win32';
        const configDir = isWindows
            ? join(process.env.APPDATA, 'anime-cli')
            : join(homedir(), '.anime-cli');
        
        this.historyFilePath = join(configDir, 'history.yml');
        this.history = this.loadHistory();
    }

    loadHistory() {
        try {
            if (existsSync(this.historyFilePath)) {
                const historyFile = readFileSync(this.historyFilePath, 'utf8');
                return load(historyFile) || [];
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
            const historyDir = dirname(this.historyFilePath);
            if (!existsSync(historyDir)) {
                mkdirSync(historyDir, { recursive: true });
            }
            writeFileSync(this.historyFilePath, '');
        } catch (error) {
            console.error(`Failed to create history file: ${error.message}`);
        }
    }

    save(animeName, episode, link, steamLink) {
        this.history.push({ animeName, episode, link, steamLink });
        try {
            const yamlStr = dump(this.history, {
                noRefs: true,
                flowLevel: 2,
                styles: { '!!null': 'null' }
            });
            writeFileSync(this.historyFilePath, yamlStr);
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
            const yamlStr = dump(this.history, {
                noRefs: true,
                flowLevel: 2,
                styles: { '!!null': 'null' }
            });
            writeFileSync(this.historyFilePath, yamlStr);
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
                const yamlStr = dump(this.history, {
                    noRefs: true,
                    flowLevel: 2,
                    styles: { '!!null': 'null' }
                });
                writeFileSync(this.historyFilePath, yamlStr);
            } catch (error) {
                console.error(`Failed to remove entry from history: ${error.message}`);
            }
        } else {
            console.error('Invalid index for history entry removal');
        }
    }
}

export default History;
