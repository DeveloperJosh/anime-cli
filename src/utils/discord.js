import pkg from 'discord-rpc';
const { register, Client } = pkg;
const clientId = '1252150069982007398';

register(clientId);

const rpc = new Client({ transport: 'ipc' });

const setRichPresence = (details, state, startTimestamp, largeImageKey, largeImageText, smallImageKey, smallImageText) => {
    try {
        if (rpc && rpc.transport && rpc.transport.socket) {
            rpc.setActivity({
                details: details || 'Using My CLI',
                state: state || 'Working on a project',
                startTimestamp: startTimestamp || Date.now(),
                largeImageKey: largeImageKey || 'image_key',
                largeImageText: largeImageText || 'CLI',
                smallImageKey: smallImageKey || 'small_image_key',
                smallImageText: smallImageText || 'Active',
                instance: false,
                buttons: [
                    { label: 'NekoNode', url: 'https://www.npmjs.com/package/nekonode' }
                ]
            });
        } else {
            console.warn('RPC client is not connected or transport socket is unavailable.');
        }
    } catch (error) {
        handleError(error);
    }
};

rpc.on('ready', () => {
    try {
        setRichPresence(
            'Using NekoNode',
            'Looking for an anime to watch...',
            Date.now(),
            'nekocli',
            'NekoNode',
            'logo2',
            'Active'
        );
    } catch (error) {
        handleError(error);
    }
});

rpc.login({ clientId }).catch(handleError);

function handleError(error) {
    // if erorr message - Could not connect then ingore it
    if (error.message === 'Could not connect') {
        return;
    } else {
    console.error(`An error occurred: ${error.message}`);
    // Optionally, you can perform additional error handling here, such as retrying or logging to a file.
    }
}

export default setRichPresence;