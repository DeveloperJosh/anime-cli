const RPC = require('discord-rpc');
const clientId = '1252150069982007398';

RPC.register(clientId);

const rpc = new RPC.Client({ transport: 'ipc' });

const setRichPresence = (details, state, startTimestamp, largeImageKey, largeImageText, smallImageKey, smallImageText) => {
    rpc.setActivity({
        details: details || 'Using My CLI',
        state: state || 'Working on a project',
        startTimestamp: startTimestamp || Date.now(),
        largeImageKey: largeImageKey || 'image_key',
        largeImageText: largeImageText || 'CLI',
        smallImageKey: smallImageKey || 'small_image_key',
        smallImageText: smallImageText || 'Active',
        instance: false,
    });
};

rpc.on('ready', () => {
    //console.log('Rich Presence is ready');
    // Set initial Rich Presence
    setRichPresence(
        'Using AniCLI',
        'Looking for an anime to watch...',
        Date.now(),
        'logo2',
        'CLI',
        'logo1',
        'Active'
    );
});

rpc.login({ clientId }).catch(console.error);

module.exports = setRichPresence