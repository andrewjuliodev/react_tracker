/**
 * Unified logging utility for the application
 * Provides consistent log formatting, log level management,
 * contextual logging, and error tracking integration
 */

// Severity levels and their priorities
export const LOG_LEVELS = {
    DEBUG: { name: 'DEBUG', value: 0, color: '#7F8C8D' },
    INFO: { name: 'INFO', value: 1, color: '#3498DB' },
    WARN: { name: 'WARN', value: 2, color: '#F39C12' },
    ERROR: { name: 'ERROR', value: 3, color: '#E74C3C' },
    NONE: { name: 'NONE', value: 4, color: '#000000' }
  };
  
  // The default log level
  let currentLogLevel = 
    process.env.LOG_LEVEL ? 
    (LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO) : 
    LOG_LEVELS.INFO;
  
  // Store recent logs in development mode
  const MAX_LOG_HISTORY = 1000;
  const logHistory = [];
  
  /**
   * Core logging function
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional data
   * @private
   */
  function _log(level, message, data) {
    // Skip logging if disabled
    if (process.env.DISABLE_LOGGING === 'true') {
      return;
    }
  
    // Skip if below current log level
    if (level.value < currentLogLevel.value) {
      return;
    }
  
    // Format timestamp
    const timestamp = new Date().toISOString();
  
    // Format data
    let formattedData = '';
    if (data !== undefined) {
      if (data instanceof Error) {
        formattedData = `\n${data.stack || data.message}`;
      } else if (typeof data === 'object') {
        try {
          formattedData = `\n${JSON.stringify(data, null, 2)}`;
        } catch (e) {
          formattedData = `\n[Object]`;
        }
      } else {
        formattedData = `\n${data}`;
      }
    }
  
    // Build log entry
    const logEntry = {
      timestamp,
      level: level.name,
      message,
      data
    };
  
    // Store in history in development
    if (__DEV__ && logHistory.length < MAX_LOG_HISTORY) {
      logHistory.push(logEntry);
    }
  
    // Format console output with color
    const consoleMessage = `${timestamp} [${level.name}] ${message}${formattedData}`;
  
    // Output to console based on level
    switch (level) {
      case LOG_LEVELS.DEBUG:
        console.log('%c' + consoleMessage, `color: ${level.color}`);
        break;
      case LOG_LEVELS.INFO:
        console.info('%c' + consoleMessage, `color: ${level.color}`);
        break;
      case LOG_LEVELS.WARN:
        console.warn('%c' + consoleMessage, `color: ${level.color}`);
        break;
      case LOG_LEVELS.ERROR:
        console.error('%c' + consoleMessage, `color: ${level.color}`);
        break;
      default:
        console.log(consoleMessage);
    }
  
    // TODO: Add remote logging integration here
  }
  
  /**
   * Logs message at debug level
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   * @returns {void}
   */
  function debug(message, context) {
    _log(LOG_LEVELS.DEBUG, message, context);
  }
  
  /**
   * Logs message at info level
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   * @returns {void}
   */
  function info(message, context) {
    _log(LOG_LEVELS.INFO, message, context);
  }
  
  /**
   * Logs message at warning level
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   * @returns {void}
   */
  function warn(message, context) {
    _log(LOG_LEVELS.WARN, message, context);
  }
  
  /**
   * Logs message at error level
   * @param {string} message - Log message
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   * @returns {void}
   */
  function error(message, error, context) {
    let combinedContext = context;
    
    // If error is passed, include it in the context
    if (error) {
      combinedContext = {
        ...(context || {}),
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      };
    }
    
    _log(LOG_LEVELS.ERROR, message, combinedContext);
  }
  
  /**
   * Sets active log level
   * @param {string} level - Desired log level
   * @returns {void}
   */
  function setLogLevel(level) {
    const newLevel = LOG_LEVELS[level.toUpperCase()];
    
    if (newLevel) {
      currentLogLevel = newLevel;
      info(`Log level set to ${newLevel.name}`);
    } else {
      warn(`Invalid log level: ${level}`);
    }
  }
  
  /**
   * Gets current log level
   * @returns {Object} Current log level
   */
  function getLogLevel() {
    return currentLogLevel;
  }
  
  /**
   * Gets recent log history
   * @returns {Array} Recent logs
   */
  function getLogHistory() {
    return [...logHistory];
  }
  
  /**
   * Clears log history
   * @returns {void}
   */
  function clearLogHistory() {
    logHistory.length = 0;
  }
  
  /**
   * Creates contextual logger
   * @param {string} namespace - Logger namespace
   * @returns {Object} Contextualized logger
   */
  function createContextLogger(namespace) {
    return {
      debug: (message, context) => debug(`[${namespace}] ${message}`, context),
      info: (message, context) => info(`[${namespace}] ${message}`, context),
      warn: (message, context) => warn(`[${namespace}] ${message}`, context),
      error: (message, error, context) => error(`[${namespace}] ${message}`, error, context)
    };
  }
  
  // Initialize logger
  info('Logger initialized', { level: currentLogLevel.name });
  
  export default {
    debug,
    info,
    warn,
    error,
    setLogLevel,
    getLogLevel,
    getLogHistory,
    clearLogHistory,
    createContextLogger,
    LOG_LEVELS
  };