// Unused code, Although it is a good idea to keep it for future reference.
const axios = require('axios');
const cheerio = require('cheerio');

function parseScriptTags(url) {
    return new Promise((resolve, reject) => {
        axios.get(url)
            .then(response => {
                const $ = cheerio.load(response.data);
                const scriptTags = $('script');
                let found = false; // Flag to indicate if a URL was found
                
                scriptTags.each((index, element) => {
                    const scriptContent = $(element).html();
                    if (scriptContent && scriptContent.includes('sources:')) {
                        const regex = /file:"(.*?)"/;
                        const match = scriptContent.match(regex);
                        if (match) {
                            found = true;
                            const url = match[1];
                            resolve(url); // Resolve the Promise with the URL
                            return false; // Break the loop after finding the URL
                        }
                    }
                });

                if (!found) {
                    reject(new Error('Try another video source option.'));
                }
            })
            .catch(error => {
                reject(new Error(`Failed to fetch or parse content: ${error.message}`));
            });
    });
}

module.exports = parseScriptTags;
