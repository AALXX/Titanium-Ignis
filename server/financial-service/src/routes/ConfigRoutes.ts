import express from 'express';
import { body, param, query as queryValidator } from 'express-validator';
import logging from '../config/logging';
import { rbacMiddleware } from '../middlewares/RBAC_Middleware';
import ConfigServices from '../services/ConfigServices';
const router = express.Router();


router.get(
    '/get-financial-config/:ProjectToken/:UserSessionToken',
    [
        param('ProjectToken')
            .trim()
            .notEmpty()
            .withMessage('Project token is required')
            .isString()
            .withMessage('Project token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Project token must be between 1 and 255 characters'),

        param('UserSessionToken').trim().notEmpty().withMessage('User session token is required').isString().withMessage('User session token must be a string'),
    ],
    ConfigServices.GetProjectConfig,
);


export = router;
