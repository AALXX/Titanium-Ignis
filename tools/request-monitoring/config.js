let globalConfig = {
  defaultServiceName: "app",
  ignorePaths: ["/health", "/metrics", "/favicon.ico"],
  logHeaders: false,
  logBody: false,
  db: {
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "request_metrics",
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    ssl: process.env.DB_SSL === "true",
  },
  batch: {
    enabled: false,
    size: 100,
    interval: 5000, // ms
  },
};

/**
 * Configure the request monitor
 * @param {Object} config - Configuration object
 */
function configure(config = {}) {
  globalConfig = {
    ...globalConfig,
    ...config,
    db: {
      ...globalConfig.db,
      ...(config.db || {}),
    },
    batch: {
      ...globalConfig.batch,
      ...(config.batch || {}),
    },
  };
}

/**
 * Get the current configuration
 * @returns {Object} Current configuration
 */
function getConfig() {
  return globalConfig;
}

module.exports = {
  configure,
  getConfig,
};
