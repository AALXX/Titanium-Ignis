import express, { NextFunction } from 'express';
import http from 'http'; // Add this import

//* imports from route folder
import BugetRoutes from './routes/BugetRoutes';

//* Configs
import config from './config/config';
import logging from './config/logging';
import { createPool, CustomRequest } from './config/postgresql';
import { connectRedis } from './config/redis';

const NAMESPACE = 'Financial_Api';
const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

logging.ensureLogFileExists();

const pool = createPool();

try {
    (async () => {
        await connectRedis();
    })();
} catch (error) {
    logging.error(NAMESPACE, 'Error connecting to PostgreSQL:', error);
}

//* Rules of Api
app.use((req: CustomRequest, res: any, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    req.pool = pool;

    if (req.method == 'OPTIONS') {
        res.header('Acces-Control-Allow-Methods', 'GET POST PATCH DELETE PUT');
        return res.status(200).json({});
    }
    next();
});

//* Routes
app.use('/api/project-budget-manager/', BugetRoutes);

//* Error Handling
app.use((req: any, res: any, next: NextFunction) => {
    const error = new Error('not found');

    return res.status(404).json({
        message: error.message,
    });
});

//* Create The Server
server.listen(config.server.port, () => {
    logging.info(NAMESPACE, `Server is running on: ${config.server.hostname}:${config.server.port}`);
});
