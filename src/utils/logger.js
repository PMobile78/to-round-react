const isProd = process.env.REACT_APP_ENVIRONMENT === 'production';

const logger = {
  log: isProd ? () => {} : console.log.bind(console),
  info: isProd ? () => {} : console.info.bind(console),
  warn: isProd ? () => {} : console.warn.bind(console),
  error: console.error.bind(console),  // always log errors
  debug: isProd ? () => {} : console.debug.bind(console),
};

export default logger;
