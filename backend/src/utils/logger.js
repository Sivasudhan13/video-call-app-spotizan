/**
 * Structured console logger for Spotizan Backend.
 * Provides ISO timestamped, leveled log outputs.
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

function formatMessage(level, message, meta = null) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

export const logger = {
  info: (message, meta) => {
    console.log(formatMessage(LOG_LEVELS.INFO, message, meta));
  },
  warn: (message, meta) => {
    console.warn(formatMessage(LOG_LEVELS.WARN, message, meta));
  },
  error: (message, meta) => {
    console.error(formatMessage(LOG_LEVELS.ERROR, message, meta));
  },
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage(LOG_LEVELS.DEBUG, message, meta));
    }
  },
};
