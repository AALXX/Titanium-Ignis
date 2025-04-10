# Request Monitor

A lightweight Node.js package for monitoring HTTP requests across different web frameworks. Collects metrics on request timing, status codes, and more.

## Features

- Support for Express, Fastify, and Koa frameworks
- Request timing and status code tracking
- Optional header and body logging
- PostgreSQL database storage
- Configurable batching for high-volume applications
- Simple dashboard (separate package)

## Installation

```bash
npm install request-monitor
```

## Quick Start

```javascript
const express = require('express');
const requestMonitor = require('request-monitor');

// Initialize the app
const app = express();

// Initialize the database connection
await requestMonitor.initDatabase({
  host: 'localhost',
  database: 'metrics',
  user: 'postgres',
  password: 'password'
});

// Create necessary tables
await requestMonitor.createTables();

// Apply the middleware
app.use(requestMonitor.express({
  serviceName: 'my-api-service'
}));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000);
```

## Configuration Options

You can configure the middleware globally or per-instance:

```javascript
// Global configuration
requestMonitor.configure({
  defaultServiceName: 'my-company-api',
  ignorePaths: ['/health', '/metrics', '/api/v1/internal'],
  logHeaders: true,
  logBody: false,
  db: {
    host: 'db.example.com',
    port: 5432
  },
  batch: {
    enabled: true,
    size: 100,
    interval: 10000 // 10 seconds
  }
});

// Per-instance configuration (overrides global)
app.use(requestMonitor.express({
  serviceName: 'auth-service',
  ignorePaths: ['/login/health'],
  logHeaders: false
}));
```

## Database Options

By default, the package uses PostgreSQL. Connection options:

```javascript
requestMonitor.initDatabase({
  user: 'postgres',
  host: 'localhost',
  database: 'request_metrics',
  password: 'password',
  port: 5432,
  ssl: false
});
```

You can also use environment variables:
- `DB_USER`
- `DB_HOST`
- `DB_NAME`
- `DB_PASSWORD`
- `DB_PORT`
- `DB_SSL`

## Framework Support

### Express

```javascript
const express = require('express');
const { express: expressMonitor } = require('request-monitor');

const app = express();
app.use(expressMonitor({ serviceName: 'my-express-app' }));
```

### Fastify

```javascript
const fastify = require('fastify')();
const { fastify: fastifyMonitor } = require('request-monitor');

fastify.register(fastifyMonitor, { serviceName: 'my-fastify-app' });
```

### Koa

```javascript
const Koa = require('koa');
const { koa: koaMonitor } = require('request-monitor');

const app = new Koa();
app.use(koaMonitor({ serviceName: 'my-koa-app' }));
```

## Dashboard

For visualization, install the companion dashboard package:

```bash
npm install request-monitor-dashboard
```

Then run the dashboard:

```javascript
const dashboard = require('request-monitor-dashboard');
dashboard.start({
  port: 3030,
  dbConfig: {
    // same options as initDatabase
  }
});
```

Access the dashboard at http://localhost:3030

## License

MIT