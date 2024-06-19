const { spawn } = require('child_process');
const History = require('./history');
const net = require('net');
const loadConfig = require('./configLoader');
const setRichPresence = require('./discord');

const config = loadConfig();
const mpvSocketName = '\\\\.\\pipe\\mpvsocket';

// Function to play video using MPV or VLC based on config
function playEpisode(episodeUrl, player, animeName, episode) {
    //const history = new History();
   // const Newest = history.getHistory().slice(-1)[0];

    const playerOptions = {
        mpv: [
            '--no-terminal',
            '-force-window=immediate',
            `--force-media-title=NekoNode - ${animeName} - ${episode}`,
            '--quiet',
            `--input-ipc-server=${mpvSocketName}`,
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

// Function to send commands to MPV via named pipe
function sendMpvCommand(command) {
    const client = net.connect(mpvSocketName, () => {
        client.write(`{"command": ["${command}"]}\n`);
        client.end();
    });

    client.on('error', (error) => {
        console.error(`Error communicating with MPV: ${error.message}`);
    });
}

async function playVideo(episodeUrl, animeName, episode) {
    try {
        playEpisode(episodeUrl, config.player, animeName, episode);
    } catch (error) {
        console.error('Error playing video:', error.message);
    }
}

module.exports = playVideo;
