const ffmpeg = require('fluent-ffmpeg');
const ora = require('ora');

function convertUrlToMp4(m3u8Url, outputPath) {
    return new Promise((resolve, reject) => {
        //console.log('Converting to MP4...');

        // Initialize the spinner
        const spinner = ora('Starting download...').start();
        spinner.color = 'yellow';

        // Initialize the progress bar

        ffmpeg(m3u8Url)
            .inputOptions(['-protocol_whitelist', 'file,http,https,tcp,tls'])
            .outputOptions([
                '-c:v copy', // Copy video stream without re-encoding
                '-c:a copy', // Copy audio stream without re-encoding
            ])
            .on('start', (commandLine) => {
                //console.log('Spawned FFmpeg with command: ' + commandLine);
                spinner.text = 'Starting conversion...';
            })
            .on('progress', (progress) => {
                if (progress.percent !== undefined) {
                    spinner.text = `Downloading... ${progress.percent.toFixed(2)}% done`;
                } else {
                    console.log('Processing: progress information not available');
                }
            })
            .on('end', () => {
                spinner.succeed('Download and conversion complete.');
                console.log('Conversion complete.');
                resolve();
            })
            .on('error', (err) => {
                spinner.fail('Download or conversion failed.');
                console.error('Error converting file:', err.message);
                reject(err);
            })
            .save(outputPath);
    });
}

module.exports = convertUrlToMp4;
