const net = require('net');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const OP_HANDSHAKE = 0;
const OP_FRAME = 1;
const OP_CLOSE = 2;

class DiscordRPC {
    constructor(clientId) {
        this.clientId = clientId;
        this.socket = null;
        this.isConnected = false;
        this.activityQueue = [];
        this.setupSignalHandlers();
    }

    setupSignalHandlers() {
        process.on('SIGINT', () => {
            this.cleanup();
            process.exit();
        });
    }

    isDiscordOpen() {
        const platform = process.platform;
        const pipeName = platform === 'win32' ? '\\\\?\\pipe\\discord-ipc-0' : '/tmp/discord-ipc-0';
        try {
            fs.accessSync(pipeName, fs.constants.R_OK | fs.constants.W_OK);
            return true;
        } catch (err) {
            return false;
        }
    }

    connect() {
        if (!this.isDiscordOpen()) {
            return;
        }

        const pipeName = process.platform === 'win32' ? '\\\\?\\pipe\\discord-ipc-0' : '/tmp/discord-ipc-0';
        this.socket = net.createConnection(pipeName, () => {
            this.isConnected = true;
            this._handshake();
        });

        this.socket.on('data', (data) => this._handleData(data));
        this.socket.on('error', (err) => this._handleError(err));
        this.socket.on('end', () => this._handleEnd());
    }

    _handshake() {
        const handshakePayload = {
            v: 1,
            client_id: this.clientId
        };
        this._sendPayload(handshakePayload, OP_HANDSHAKE);
    }

    _sendPayload(payload, op) {
        if (!this.isConnected || !this.socket) {
            return;
        }

        const payloadStr = JSON.stringify(payload);
        const buffer = Buffer.alloc(8 + Buffer.byteLength(payloadStr));
        buffer.writeUInt32LE(op, 0);
        buffer.writeUInt32LE(Buffer.byteLength(payloadStr), 4);
        buffer.write(payloadStr, 8);
        this.socket.write(buffer);
    }

    _handleData(data) {
        const encHeader = data.slice(0, 8);
        const length = encHeader.readUInt32LE(4);
        const encData = data.slice(8, 8 + length);
        const response = JSON.parse(encData.toString('utf-8'));

        if (response.evt === 'READY') {
            this._processActivityQueue();
        }
    }

    _handleError(err) {
        this.isConnected = false;
    }

    _handleEnd() {
        this.isConnected = false;
    }

    setActivity(activity) {
        if (!this.isConnected) {
            this.activityQueue.push(activity);
            return;
        }
        this._sendActivity(activity);
    }

    _sendActivity(activity) {
        const payload = {
            cmd: 'SET_ACTIVITY',
            args: {
                pid: process.pid,
                activity: activity
            },
            nonce: uuidv4()
        };

        this._sendPayload(payload, OP_FRAME);
    }

    _processActivityQueue() {
        while (this.activityQueue.length > 0) {
            const activity = this.activityQueue.shift();
            this._sendActivity(activity);
        }
    }

    cleanup() {
        if (this.isConnected) {
            this._sendPayload({}, OP_CLOSE);
            this.socket.end();
            this.isConnected = false;
        }
    }

    disconnect() {
        this.cleanup();
    }
}

module.exports = DiscordRPC;
