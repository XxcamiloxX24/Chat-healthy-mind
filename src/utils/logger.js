// src/utils/logger.js
const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  info: (...args) => {
    if (isDev) console.log(...args);
  },
  debug: (...args) => {
    if (isDev) console.log(...args);
  },
  error: (...args) => {
    console.error(...args);
  }
};

module.exports = logger;
