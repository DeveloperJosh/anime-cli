const DiscordRPC = require('./DiscordRPC.js');
const clientId = '1252150069982007398';

const rpc = new DiscordRPC(clientId);

const setRichPresence = (details, state, startTimestamp, largeImageKey, largeImageText, smallImageKey, smallImageText) => {
    rpc.setActivity({
        details: details || 'Using My CLI',
        state: state || 'Working on a project',
        timestamps: {
            start: startTimestamp || Math.floor(Date.now() / 1000)
        },
        assets: {
            large_image: largeImageKey || 'image_key',
            large_text: largeImageText || 'CLI',
            small_image: smallImageKey || 'small_image_key',
            small_text: smallImageText || 'Active'
        },
        buttons: [
            { label: 'NekoNode', url: 'https://www.npmjs.com/package/nekonode' }
        ]
    });
};

rpc.connect();

// This will automatically set the activity once connected
rpc.setActivity({
    details: 'Using NekoNode',
    state: 'Looking for an anime to watch...',
    timestamps: {
        start: Math.floor(Date.now() / 1000)
    },
    assets: {
        large_image: 'nekocli',
        large_text: 'NekoNode',
        small_image: 'logo2',
        small_text: 'Active'
    },
    buttons: [
        { label: 'NekoNode', url: 'https://www.npmjs.com/package/nekonode' }
    ]
});

module.exports = setRichPresence;
