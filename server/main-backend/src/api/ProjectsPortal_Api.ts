import express, { NextFunction } from 'express';
import http from 'http'; // Add this import
import { Server } from 'socket.io';

//* imports from route folder
import UserAccountManagerRoutes from '../routes/UserAccountManager';
import ProjectsRoutes from '../routes/ProjectsRoutes';
import SocketIoRoutes from '../routes/SocketIoRoutes';

//* Configs
import config from '../config/config';
import logging from '../config/logging';
import { createPool, CustomRequest } from '../config/postgresql';
import { connectRedis } from '../config/redis';

const NAMESPACE = 'ProjectsPortal_Api';
const app = express();
const server = http.createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: '*', // Be more specific in production
        methods: ['GET', 'POST'],
        allowedHeaders: ['Authorization'],
        credentials: true,
    },
});

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
    req.ioServer = io;

    if (req.method == 'OPTIONS') {
        res.header('Acces-Control-Allow-Methods', 'GET POST PATCH DELETE PUT');
        return res.status(200).json({});
    }
    next();
});

//* Routes
app.use('/api/user-account-manager/', UserAccountManagerRoutes);
app.use('/api/projects-manager/', ProjectsRoutes);
SocketIoRoutes.initSorketioRoutes(io, pool);

//* Error Handling
app.use((req: any, res: any, next: NextFunction) => {
    const error = new Error('not found');

    return res.status(404).json({
        message: error.message,
    });
});

//* Create The Server
server.listen(config.server.port, () => {
    logging.info(NAMESPACE, `Server is asd running on: ${config.server.hostname}:${config.server.port}`);
});
