import dotenv from 'dotenv';

dotenv.config();

//* MySql Config
const POSTGRESQL_HOST = process.env.POSTGRESQL_HOST || '0.0.0.0';
const POSTGRESQL_DATABASE = process.env.POSTGRESQL_DATABASE || 'app_db';
const POSTGRESQL_USER = process.env.POSTGRESQL_USER || 'root';
const POSTGRESQL_PASSWORD = process.env.POSTGRESQL_PASSWORD || 'root';

const POSTGRESQL = {
    host: POSTGRESQL_HOST,
    user: POSTGRESQL_USER,
    password: POSTGRESQL_PASSWORD,
    database: POSTGRESQL_DATABASE,
};

//* API config
const SERVER_HSOTNAME = process.env.SERVER_HSOTNAME || 'localhost';
const SERVER_PORT = process.env.PORT || 5202;

const SERVER = {
    hostname: SERVER_HSOTNAME,
    port: SERVER_PORT,
};

const config = {
    pg: POSTGRESQL,
    server: SERVER,
};

export default config;
