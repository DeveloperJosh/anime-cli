const { spawn } = require('child_process');
const fs = require('fs');
const yaml = require('js-yaml');
const inquirer = require('inquirer');
const net = require('net');

let config;
try {
    const configFile = fs.readFileSync(`${process.env.APPDATA}/anime-cli/config.yml`, 'utf8');
    config = yaml.load(configFile);
} catch (e) {
    console.error(`Failed to load configuration: ${e.message}, create a config.yml file with the required configuration.`);

    // Make sure the config appdata folder exists
    if (!fs.existsSync(`${process.env.APPDATA}/anime-cli`)) {
        fs.mkdirSync(`${process.env.APPDATA}/anime-cli`, { recursive: true });
    }

    // Create a default config file
    fs.writeFileSync(`${process.env.APPDATA}/anime-cli/config.yml`, `player: mpv`);
    // add base url to the config file
    fs.appendFileSync(`${process.env.APPDATA}/anime-cli/config.yml`, '\nbaseUrl: https://gogoanime3.co');

    process.exit(1);
}

let processHandle;
const mpvSocketName = '\\\\.\\pipe\\mpvsocket';

// Function to play video using MPV or VLC based on config
function playEpisode(episodeUrl, player) {

    const playerOptions = {
        mpv: [
            '--no-terminal',
            '--quiet',
            `--input-ipc-server=${mpvSocketName}`,
            '--cache=yes',
            '--hwdec=auto',
            '--vf=scale=1920:1080',
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

    processHandle = spawn(command, options, { stdio: 'inherit' });

    processHandle.on('error', (error) => {
        console.error(`Error starting ${player}: ${error.message}`);
    });

    processHandle.on('close', async (code) => {
        if (code === 0) {
            console.clear(); // Clear console after player exits
            process.exit(0);
        } else {
            console.error(`${player.toUpperCase()} exited with code ${code}`);
            process.exit(1);
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

async function playVideo(episodeUrl) {
    try {
        console.clear(); // Clear console before starting the player
        // Play the video
        playEpisode(episodeUrl, config.player);
        console.log('The Player is encoding the video, please wait for a few seconds...');

        let playing = true;

        while (playing) {
            const { menu } = await inquirer.prompt({
                type: 'list',
                name: 'menu',
                message: 'Select an option:',
                choices: [
                    { name: 'Info', value: 'info' },
                    { name: 'Stop', value: 'stop' }
                ]
            });

            if (config.player === 'mpv') {
                if (menu === 'stop') {
                    sendMpvCommand('quit');
                    playing = false;
                } else if (menu === 'info') {

                    console.clear(); // Clear console before showing the info

                    console.log(`Player: ${config.player}\n\Episode URL: ${episodeUrl}\n`);

                    await inquirer.prompt({
                        type: 'input',
                        name: 'continue',
                        message: 'Press Enter to continue...'
                    });
                    console.clear(); // Clear console after showing the info
                }
            } else if (config.player === 'vlc') {
                console.log('VLC command execution is not supported on Windows via named pipes.');
                playing = false; // Stop the loop for now as VLC control is not implemented
            }
        }
    } catch (error) {
        console.error('Error playing video:', error.message);
    }
}

module.exports = playVideo;
