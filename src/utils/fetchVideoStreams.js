// This is not a part of the main application, but it wil be next time i update the main application

const axios = require('axios');
const base64 = require('base-64');
const m3u8Parser = require('m3u8-parser');
const url = require('url');

async function getVideoStreams(identifier, episode, lang) {
    try {
        // Decode the identifier
        const decodedIdentifier = base64.decode(identifier);
        const [idNum] = decodedIdentifier.split("/");

        // Prepare the video query
        const videoQuery = lang === 'DUB' ? `${idNum}|${episode}|dub` : `${idNum}|${episode}`;
        const encodedQuery = base64.encode(videoQuery);

        // Send POST request to get HLS playlists
        const postUrl = 'https://yugenanime.tv/api/embed/';
        const postData = `id=${encodedQuery}&ac=0`;

        console.log(`Sending POST request to ${postUrl} with data: ${postData}`);

        const response = await axios.post(postUrl, postData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-requested-with': 'XMLHttpRequest'
            }
        });

        // Check if the response status is 200 OK
        if (response.status !== 200) {
            throw new Error(`Received HTTP ${response.status} from API`);
        }

        const responseData = response.data;
        console.log('Response data:', responseData);

        if (!responseData.hls) {
            throw new Error('No "hls" key found in the response');
        }

        const streams = [];

        for (const playlist of responseData.hls) {
            console.log(`Fetching playlist URL: ${playlist}`);
            const playlistResponse = await axios.get(playlist);

            if (playlistResponse.status !== 200) {
                throw new Error(`Received HTTP ${playlistResponse.status} from playlist URL`);
            }

            const parser = new m3u8Parser.Parser();
            parser.push(playlistResponse.data);
            parser.end();
            const parsedPlaylist = parser.manifest;

            if (parsedPlaylist.playlists.length === 0) {
                streams.push({
                    url: playlist,
                    resolution: 1080,
                    episode,
                    language: lang
                });
            } else {
                for (const subPlaylist of parsedPlaylist.playlists) {
                    const streamUrl = url.resolve(playlist, subPlaylist.uri);
                    streams.push({
                        url: streamUrl,
                        resolution: subPlaylist.attributes.RESOLUTION.height,
                        episode,
                        language: lang
                    });
                }
            }
        }

        return streams;
    } catch (error) {
        if (error.response && error.response.status === 500) {
            // Handle maintenance message
            if (error.response.data.includes("YugenAnime is currently under maintenance")) {
                console.error("YugenAnime is currently under maintenance. Please try again later.");
            } else {
                console.error(`Error fetching video streams: ${error.message}`);
                console.error('Full error details:', error.response.data);
            }
        } else {
            console.error(`Error fetching video streams: ${error.message}`);
        }
        return [];
    }
}

module.exports = getVideoStreams;
