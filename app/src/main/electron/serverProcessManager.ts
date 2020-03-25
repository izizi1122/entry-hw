import spawn from 'cross-spawn';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ChildProcess } from 'child_process';
import createLogger from './functions/createFileLogger';

const logger = createLogger('electron/server');

class ServerProcessManager {
    private readonly childProcess: ChildProcess;
    private router: any;

    constructor(router?: any) {
        try {
            // this.childProcess = new Server();
            const serverBinaryPath = this._getServerFilePath();
            logger.info(`EntryServer try to spawn.. ${serverBinaryPath}`);
            fs.accessSync(serverBinaryPath);
            this.childProcess = spawn(serverBinaryPath, [], {
                stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
                detached: true,
            });
            logger.info('EntryServer spawned successfully');
            this.router = router;
        } catch (e) {
            logger.error('Error occurred while spawn Server Process.', e);
            throw new Error(
                'Error occurred while spawn Server Process. make sure it exists same dir path',
            );
        }
    }

    setRouter(router: any) {
        this.router = router;
    }

    _getServerFilePath() {
        const asarIndex = app.getAppPath().indexOf(`${path.sep}app.asar`);
        if (asarIndex > -1) {
            if (os.type().includes('Darwin')) {
                return path.join(app.getAppPath().substr(0, asarIndex), 'server.txt');
            } else {
                return path.join(app.getAppPath().substr(0, asarIndex), 'server.exe');
            }
        } else {
            const serverDirPath = [__dirname, '..', 'server'];
            if (os.type().includes('Darwin')) {
                console.log(path.join(...serverDirPath, 'mac', 'server.txt'));
                return path.resolve(...serverDirPath, 'mac', 'server.txt');
            } else {
                return path.resolve(...serverDirPath, 'win', 'server.exe');
            }
        }
    }

    open() {
        this._receiveFromChildEventRegister();
        this._sendToChild('open');
        // this.childProcess.open();
    }

    close() {
        this.childProcess && this.childProcess.kill();
    }

    addRoomIdsOnSecondInstance(roomId: string) {
        // this.childProcess.addRoomId(roomId);
        this._sendToChild('addRoomId', roomId);
    }

    disconnectHardware() {
        // this.childProcess.disconnectHardware();
        this._sendToChild('disconnectHardware');
    }

    send(data: any) {
        // this.childProcess.sendToClient(data);
        this._sendToChild('send', data);
    }

    /**
     * @param methodName{string}
     * @param message{Object?}
     * @private
     */
    _sendToChild(methodName: string, message?: any) {
        this._isProcessLive() && this.childProcess.send({
            key: methodName,
            value: message,
        });
    }

    _receiveFromChildEventRegister() {
        // this.childProcess.on('cloudModeChanged', (mode) => {
        //     this.router.notifyCloudModeChanged(mode);
        // });
        // this.childProcess.on('runningModeChanged', (mode) => {
        //     this.router.notifyServerRunningModeChanged(mode);
        // });
        // this.childProcess.on('message', (message) => {
        //     this.router.handleServerData(message);
        // });
        // this.childProcess.on('close', () => {

        // });
        this.childProcess && this.childProcess.on('message', (message: { key: string; value: string; }) => {
            const { key, value } = message;
            switch (key) {
                case 'cloudModeChanged': {
                    this.router.notifyCloudModeChanged(value);
                    break;
                }
                case 'runningModeChanged': {
                    this.router.notifyServerRunningModeChanged(value);
                    break;
                }
                case 'data': {
                    this.router.handleServerData(value);
                    break;
                }
                case 'connection': {
                    this.router.handleServerSocketConnected();
                    break;
                }
                case 'close': {
                    this.router.handleServerSocketClosed();
                    break;
                }
                default: {
                    console.error('unhandled pkg server message', key, value);
                }
            }
        });
    }

    _isProcessLive() {
        return this.childProcess &&
            !this.childProcess.killed &&
            this.childProcess.connected &&
            this.childProcess.channel;
    }
}

export default ServerProcessManager;