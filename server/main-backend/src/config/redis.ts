import { createClient } from 'redis';
import logging from './logging';

// Connect to Redis
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || '',
});

async function connectRedis() {
    try {
        await redisClient.connect();
    } catch (err: any) {
        logging.error('REDIS_CONNECTION_ERROR', err);
    }
}

redisClient.on('connect', () => {
});

redisClient.on('error', (err) => {
    logging.error('REDIS_CONNECTION_ERROR', err);
});

export { redisClient, connectRedis };
