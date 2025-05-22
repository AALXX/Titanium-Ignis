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

//* Scylla Config
const SCYLLA_HOST: string[] = [(process.env.SCYLLA_HOST as string) || '0.0.0.0'];
const SCYLLA_DATAC_CENTER: string = process.env.SCYLLA_DATAC_CENTER || 'datacenter1';
const SCYLLA_KEY_SPACE: string = process.env.SCYLLA_KEY_SPACE || 'app_db';
const SCYLLA_USER: string = process.env.SCYLLA_USER || '';
const SCYLLA_PASSWORD: string = process.env.SCYLLA_PASSWORD || '';

const SCYLLA = {
    contactPoints: SCYLLA_HOST,
    localDataCenter: SCYLLA_DATAC_CENTER,
    keyspace: SCYLLA_KEY_SPACE,
    user: SCYLLA_USER,
    password: SCYLLA_PASSWORD,
};

//* API config
const SERVER_HSOTNAME = process.env.SERVER_HSOTNAME || 'localhost';
const SERVER_PORT = process.env.PORT || 7070;

const SERVER = {
    hostname: SERVER_HSOTNAME,
    port: SERVER_PORT,
};

const config = {
    pg: POSTGRESQL,
    server: SERVER,
    scylla: SCYLLA,
};

export default config;
