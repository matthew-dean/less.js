import path from 'path';
import fs from './fs';
import AbstractFileManager from '../less/environment/abstract-file-manager.js';

class FileManager extends AbstractFileManager {
    supports() {
        return true;
    }

    supportsSync() {
        return true;
    }

    loadFile(filename, currentDirectory, options, environment, callback) {
        
    }

    loadFileSync(filename, currentDirectory, options, environment) {
        options.syncImport = true;
        return this.loadFile(filename, currentDirectory, options, environment);
    }
}

export default FileManager;