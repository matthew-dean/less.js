import Visitor from './visitor/visitor'
import { Less } from './index'
import { Plugin } from './types'
import FileManager from './environment/file-manager'

/**
 * Public plugin interface
 */
class PluginManager {
  visitors: Visitor[] = []
  less: Less
  plugins: Plugin[] = []
  fileManagers: FileManager[] = []
  iterator: number = -1

  constructor(less: Less) {
    this.less = less
  }

    /**
     *
     * @param filename
     */
    get(filename) {
      return this.pluginCache[filename];
    }

    /**
     * Adds a pre processor object - a pre-processor receives 
     * @param {object} preProcessor
     * @param {number} priority - guidelines 1 = before import, 1000 = import, 2000 = after import
     */
    addPreProcessor(preProcessor, priority) {
        let indexToInsertAt;
        for (indexToInsertAt = 0; indexToInsertAt < this.preProcessors.length; indexToInsertAt++) {
            if (this.preProcessors[indexToInsertAt].priority >= priority) {
                break;
            }
        }
        this.preProcessors.splice(indexToInsertAt, 0, {preProcessor, priority});
    }

    /**
     * Adds a post processor object
     * @param {object} postProcessor
     * @param {number} priority - guidelines 1 = before compression, 1000 = compression, 2000 = after compression
     */
    addPostProcessor(postProcessor, priority) {
        let indexToInsertAt;
        for (indexToInsertAt = 0; indexToInsertAt < this.postProcessors.length; indexToInsertAt++) {
            if (this.postProcessors[indexToInsertAt].priority >= priority) {
                break;
            }
        }
        this.postProcessors.splice(indexToInsertAt, 0, {postProcessor, priority});
    }

    /**
     *
     * @returns {Array}
     * @private
     */
    getPreProcessors() {
        const preProcessors = [];
        for (let i = 0; i < this.preProcessors.length; i++) {
            preProcessors.push(this.preProcessors[i].preProcessor);
        }
        return preProcessors;
    }

    /**
     *
     * @returns {Array}
     * @private
     */
    getPostProcessors() {
        const postProcessors = [];
        for (let i = 0; i < this.postProcessors.length; i++) {
            postProcessors.push(this.postProcessors[i].postProcessor);
        }
        return postProcessors;
    }

    /**
     *
     * @returns {Array}
     * @private
     */
    getVisitors() {
        return this.visitors;
    }

    visitor() {
        const self = this;
        return {
            first: function() {
                self.iterator = -1;
                return self.visitors[self.iterator];
            },
            get: function() {
                self.iterator += 1;
                return self.visitors[self.iterator];
            }
        };
    }
}

let pm;

function PluginManagerFactory(less, newFactory) {
    if (newFactory || !pm) {
        pm = new PluginManager(less);
    }
    return pm;
};

//
export default PluginManagerFactory;
