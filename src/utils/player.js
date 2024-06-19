const { spawn } = require('child_process');
const loadConfig = require('./configLoader');

const config = loadConfig();

// Function to play video using MPV or VLC based on config
function playEpisode(episodeUrl, player, animeName, episode) {

    const playerOptions = {
        mpv: [
            '--no-terminal',
            '-force-window=immediate',
            `--force-media-title=NekoNode - ${animeName} - ${episode}`,
            '--quiet',
            '--cache=yes',
            '--hwdec=auto',
            '--vf=scale=1920:1080',
            '--video-sync=display-resample', 
            episodeUrl
        ],
        vlc: [
            '--quiet',
            '--video-filter=scale',
            '--scale=1',
            '--height=1080',
            episodeUrl
        ]
    };

    const command = player === 'vlc' ? 'vlc' : 'mpv';
    const options = playerOptions[player];

    let processHandle = spawn(command, options, { stdio: 'inherit' });

    processHandle.on('error', (error) => {
        console.error(`Error starting ${player}: ${error.message}`);
    });

    processHandle.on('close', (code) => {
        if (code === 0) {
            return;
        } else {
            console.error(`${player} exited with code ${code}, This means you should try a new source.`);
            process.exit(code);
        }
    });

    return processHandle;
}

async function playVideo(episodeUrl, animeName, episode) {
    try {
        playEpisode(episodeUrl, config.player, animeName, episode);
    } catch (error) {
        console.error('Error playing video:', error.message);
    }
}

module.exports = playVideo;
