const { logRequest } = require("../database");
const { getConfig } = require("../config");

/**
 * Express middleware for request monitoring
 * @param {Object} options - Configuration options
 * @param {string} options.serviceName - Name of the service using the middleware
 * @param {boolean} options.logHeaders - Whether to log request headers
 * @param {boolean} options.logBody - Whether to log request/response body
 * @param {Array<string>} options.ignorePaths - Paths to ignore (e.g. ['/health', '/metrics'])
 */
  function middleware(options = {}) {
  const config = getConfig();
  const serviceName = options.serviceName || config.defaultServiceName || "unknown-service";
  const ignorePaths = options.ignorePaths || config.ignorePaths || [];
  const projectToken = options.projectToken || config.projectToken || process.env.PROJECT_TOKEN;

  if (!projectToken) {
    console.error("[request-monitor] Project token not configured. Request monitoring disabled.");
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    if (ignorePaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    const startTime = Date.now();

    const requestData = {
      ProjectToken: projectToken,
      ServiceName: serviceName,
      Method: req.method,
      Path: req.path,
      RequestIP: req.ip || req.connection.remoteAddress,
      UserAgent: req.get("user-agent") || "",
      Timestamp: new Date(),
    };

    if (options.logHeaders || config.logHeaders) {
      requestData.Headers = JSON.stringify(req.headers);
    }

    // if (options.logBody || config.logBody) {
    //   requestData.request_body = typeof req.body === "object" ? JSON.stringify(req.body) : String(req.body || "");
    // }

    const originalEnd = res.end;

    res.end = function (chunk, encoding) {
      originalEnd.apply(res, arguments);

      const responseTime = Date.now() - startTime;

      requestData.Status = res.statusCode;
      requestData.ResponseTime = responseTime;

      logRequest(requestData).catch((err) => {
        console.error("[request-monitor] Failed to log request:", err);
      });
    };

    next();
  };
}

module.exports = { middleware };
