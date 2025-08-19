/**
 * @typedef {Object} LogListener
 * @property {function(string): void} [error] - Error logging function
 * @property {function(string): void} [warn] - Warning logging function
 * @property {function(string): void} [info] - Info logging function
 * @property {function(string): void} [debug] - Debug logging function
 */

/**
 * @typedef {Object} Logger
 * @property {function(string): void} error - Log an error message
 * @property {function(string): void} warn - Log a warning message
 * @property {function(string): void} info - Log an info message
 * @property {function(string): void} debug - Log a debug message
 * @property {function(LogListener): void} addListener - Add a log listener
 * @property {function(LogListener): void} removeListener - Remove a log listener
 * @property {function(string, string): void} _fireEvent - Internal method to fire log events
 * @property {LogListener[]} _listeners - Array of registered listeners
 */

/** @type {Logger} */
export default {
    /**
     * Log an error message
     * @param {string} msg - The error message to log
     */
    error: function(msg) {
        this._fireEvent('error', msg);
    },
    
    /**
     * Log a warning message
     * @param {string} msg - The warning message to log
     */
    warn: function(msg) {
        this._fireEvent('warn', msg);
    },
    
    /**
     * Log an info message
     * @param {string} msg - The info message to log
     */
    info: function(msg) {
        this._fireEvent('info', msg);
    },
    
    /**
     * Log a debug message
     * @param {string} msg - The debug message to log
     */
    debug: function(msg) {
        this._fireEvent('debug', msg);
    },
    
    /**
     * Add a log listener
     * @param {LogListener} listener - The listener object to add
     */
    addListener: function(listener) {
        this._listeners.push(listener);
    },
    
    /**
     * Remove a log listener
     * @param {LogListener} listener - The listener object to remove
     */
    removeListener: function(listener) {
        for (let i = 0; i < this._listeners.length; i++) {
            if (this._listeners[i] === listener) {
                this._listeners.splice(i, 1);
                return;
            }
        }
    },
    
    /**
     * Internal method to fire log events
     * @param {string} type - The type of log event ('error', 'warn', 'info', 'debug')
     * @param {string} msg - The message to log
     */
    _fireEvent: function(type, msg) {
        for (let i = 0; i < this._listeners.length; i++) {
            const logFunction = this._listeners[i][type];
            if (logFunction) {
                logFunction(msg);
            }
        }
    },
    
    /** @type {LogListener[]} */
    _listeners: []
};
