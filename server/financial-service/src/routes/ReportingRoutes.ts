import express from 'express';
import { param, query } from 'express-validator';

import logging from '../config/logging';
import { rbacMiddleware } from '../middlewares/RBAC_Middleware';
import ReportingServices from '../services/ReportingServices';
const router = express.Router();


router.get(
    '/profit-loss/:ProjectToken/:UserSessionToken',
    // rbacMiddleware('finance', 'read'), // Uncomment when RBAC is ready
    [
        param('ProjectToken')
            .trim()
            .notEmpty()
            .withMessage('Project token is required')
            .isString()
            .withMessage('Project token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Project token must be between 1 and 255 characters'),

        param('UserSessionToken')
            .trim()
            .notEmpty()
            .withMessage('User session token is required')
            .isString()
            .withMessage('User session token must be a string')
            .isLength({ min: 1, max: 500 })
            .withMessage('User session token is invalid'),

        query('StartDate').optional().isISO8601().withMessage('StartDate must be a valid date in YYYY-MM-DD format').toDate(),

        query('EndDate')
            .optional()
            .isISO8601()
            .withMessage('EndDate must be a valid date in YYYY-MM-DD format')
            .toDate()
            .custom((endDate, { req }) => {
                if (req.query!.StartDate && endDate < new Date(req.query!.StartDate as string)) {
                    throw new Error('EndDate must be after StartDate');
                }
                return true;
            }),

        query('GroupBy').optional().isIn(['month', 'quarter', 'year']).withMessage('GroupBy must be one of: month, quarter, year'),
    ],
    ReportingServices.GetProjectProfitLoss,
);



export = router;
