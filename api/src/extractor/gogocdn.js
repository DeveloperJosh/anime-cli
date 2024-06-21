import axios from 'axios';
import { load } from 'cheerio';
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';
import { getCache, setCache } from './utils/cache.js';
dotenv.config();

const baseUrl = process.env.BASE_URL;

const keys = {
    key: CryptoJS.enc.Utf8.parse(process.env.CRYPTO_KEY),
    secondKey: CryptoJS.enc.Utf8.parse(process.env.CRYPTO_SECOND_KEY),
    iv: CryptoJS.enc.Utf8.parse(process.env.CRYPTO_IV),
};

// Function to get the iframe source URL for a given episode
async function getIframeSrc(episode) {
    try {
        // Remove colons from episode identifiers
        episode = episode.replace(':', '');

        // Check for cached iframe URL
        const cachedIframeSrc = getCache(episode);
        if (cachedIframeSrc) {
            //console.log('Using cached iframe URL:', cachedIframeSrc);
            return cachedIframeSrc;
        }

        // Construct the URL and fetch the page
        const url = `${baseUrl}${episode}`;
        console.log('Fetching episode URL:', url);
        const { data: html } = await axios.get(url);
        
        // Load the HTML and find the iframe source
        const $ = load(html);
        const iframeSrc = $('#load_anime > div > div > iframe').attr('src');

        // Cache the iframe source URL
        if (iframeSrc) {
            setCache(episode, iframeSrc);
        }

        return iframeSrc;
    } catch (error) {
        console.error('Error fetching or parsing HTML:', error);
        throw new Error('Failed to retrieve iframe source');
    }
}

// Function to generate encrypted parameters for an AJAX request
async function generateEncryptedAjaxParams($, id) {
    const encryptedKey = CryptoJS.AES.encrypt(id, keys.key, { iv: keys.iv }).toString();
    const scriptValue = $("script[data-name='episode']").attr('data-value');
    const decryptedToken = CryptoJS.AES.decrypt(scriptValue, keys.key, { iv: keys.iv }).toString(CryptoJS.enc.Utf8);

    return `id=${encryptedKey}&alias=${id}&${decryptedToken}`;
}

// Function to decrypt AJAX data
async function decryptAjaxData(encryptedData) {
    const decryptedData = CryptoJS.AES.decrypt(encryptedData, keys.secondKey, { iv: keys.iv }).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedData);
}

// Function to extract video URLs from a video URL
async function extractVideoUrls(videoUrl) {
    // Check if the video URL is cached
    const cachedSources = getCache(videoUrl.href);
    if (cachedSources) {
        //console.log('Using cached video URLs for:', videoUrl.href);
        return cachedSources;
    }

    // Fetch the video page and parse the HTML
    const res = await axios.get(videoUrl.href);
    const $ = load(res.data);

    // Generate encrypted AJAX parameters
    const encryptedParams = await generateEncryptedAjaxParams($, videoUrl.searchParams.get('id') || '');
    const encryptedData = await axios.get(`${videoUrl.protocol}//${videoUrl.hostname}/encrypt-ajax.php?${encryptedParams}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });

    // Decrypt the data to get the video sources
    const decryptedData = await decryptAjaxData(encryptedData.data.data);
    if (!decryptedData.source) throw new Error('No source found. Try a different server.');

    const sources = [];
    if (decryptedData.source[0].file.includes('.m3u8')) {
        const resResult = await axios.get(decryptedData.source[0].file.toString());
        const resolutions = resResult.data.match(/(RESOLUTION=)(.*)(\s*?)(\s*.*)/g);
        resolutions.forEach(res => {
            const index = decryptedData.source[0].file.lastIndexOf('/');
            const quality = res.split('\n')[0].split('x')[1].split(',')[0];
            const url = decryptedData.source[0].file.slice(0, index);
            sources.push({
                url: url + '/' + res.split('\n')[1],
                isM3U8: (url + res.split('\n')[1]).includes('.m3u8'),
                quality: quality + 'p'
            });
        });
    } else {
        decryptedData.source.forEach(source => {
            sources.push({
                url: source.file,
                isM3U8: source.file.includes('.m3u8'),
                quality: source.label.split(' ')[0] + 'p'
            });
        });
    }

    decryptedData.source_bk.forEach(source => {
        sources.push({
            url: source.file,
            isM3U8: source.file.includes('.m3u8'),
            quality: 'backup'
        });
    });

    // Cache the video sources
    setCache(videoUrl.href, sources);

    return sources;
}

// Function to get video sources for a specific anime episode
async function getEpisodeSources(name, episode) {
    const anime = `${name}-episode-${episode}`;
    const iframeSrc = await getIframeSrc(anime);
    const videoUrl = new URL(iframeSrc);
    const videoSources = await extractVideoUrls(videoUrl);
    return videoSources;
}

export default getEpisodeSources;
