import express, { NextFunction } from 'express';

//* imports from route folder
import UserAccountManagerRoutes from '../routes/UserAccountManager';
import ProjectsRoutes from '../routes/ProjectsRoutes';

//* Configs
import config from '../config/config';
import logging from '../config/logging';
import { createPool } from '../config/postgresql';
const NAMESPACE = 'BackendApp_Api';
const router = express();

router.use(express.json({ limit: '10mb' }));
router.use(express.urlencoded({ limit: '10mb', extended: true }));

logging.ensureLogFileExists();

const pool = createPool();

//* Rules of Api
router.use((req: any, res: any, next: NextFunction) => {
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
router.use('/api/user-account-manager/', UserAccountManagerRoutes);
router.use('/api/projects-manager/', ProjectsRoutes);

//* Error Handleling
router.use((req: any, res: any, next: NextFunction) => {
    const error = new Error('not found');

    return res.status(404).json({
        message: error.message,
    });
});

//* Create The Api
router.listen(config.server.port, () => {
    logging.info(NAMESPACE, `Api is runing on: ${config.server.hostname}:${config.server.port}`);
});

