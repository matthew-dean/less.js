/**
 * @todo Document why this abstraction exists, and the relationship between
 *       environment, file managers, and plugin manager
 */

import logger from '../logger';
import type { Context } from '../contexts';

class Environment {
    /** @todo - refine types */
    fileManagers: any[];

    constructor(externalEnvironment, fileManagers) {
        this.fileManagers = fileManagers || [];
        externalEnvironment = externalEnvironment || {};

        const optionalFunctions = ['encodeBase64', 'mimeLookup', 'charsetLookup', 'getSourceMapGenerator'];
        const requiredFunctions = [];
        const functions = requiredFunctions.concat(optionalFunctions);

        for (let i = 0; i < functions.length; i++) {
            const propName = functions[i];
            const environmentFunc = externalEnvironment[propName];
            if (environmentFunc) {
                this[propName] = environmentFunc.bind(externalEnvironment);
            } else if (i < requiredFunctions.length) {
                logger.warn(`missing required function in environment - ${propName}`);
            }
        }
    }

    /**
     * @todo
     * It seems like the local setup environment should be part of context,
     * and not a separate parameter (although we should keep it for historical API?)
     */
    getFileManager(filename, currentDirectory, context: Context, environment, isSync) {

        if (!filename) {
            logger.warn('getFileManager called with no filename.. Please report this issue. continuing.');
        }
        if (currentDirectory == null) {
            logger.warn('getFileManager called with null directory.. Please report this issue. continuing.');
        }

        let fileManagers = this.fileManagers;
        if (context.pluginManager) {
            fileManagers = [].concat(fileManagers).concat(context.pluginManager.getFileManagers());
        }
        for (let i = fileManagers.length - 1; i >= 0 ; i--) {
            const fileManager = fileManagers[i];
            if (fileManager[isSync ? 'supportsSync' : 'supports'](filename, currentDirectory, context, environment)) {
                return fileManager;
            }
        }
        return null;
    }

    addFileManager(fileManager) {
        this.fileManagers.push(fileManager);
    }

    clearFileManagers() {
        this.fileManagers = [];
    }
}

export default Environment;
