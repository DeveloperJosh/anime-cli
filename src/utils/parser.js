const axios = require('axios');
const cheerio = require('cheerio');

function parseScriptTags(url) {
    return new Promise((resolve, reject) => {
        axios.get(url)
            .then(response => {
                const $ = cheerio.load(response.data);
                // Select all script tags
                const scriptTags = $('script');
                // Iterate over each script tag
                scriptTags.each((index, element) => {
                    const scriptContent = $(element).html();
                    // Check if the script content contains 'sources:'
                    if (scriptContent.includes('sources:')) {
                        // Use a regular expression to extract the URL
                        const regex = /file:"(.*?)"/;
                        const match = scriptContent.match(regex);
                        if (match) {
                            const url = match[1];
                            //console.log(url);
                            resolve(url); // Resolve the Promise with the URL
                        }
                    }
                });
            })
            .catch(reject); // Reject the Promise if there's an error
    });
}

module.exports = parseScriptTags;