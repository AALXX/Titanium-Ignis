import express from 'express';
import { body, param } from 'express-validator';
import BugetServices from '../services/BugetServices';
import logging from '../config/logging';
import { rbacMiddleware } from '../middlewares/RBAC_Middleware';
const router = express.Router();

router.get(
    '/get-project-bugets/:ProjectToken/:UserSessionToken',
    // rbacMiddleware('deployment', 'read'),
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
    ],
    BugetServices.GetProjectBugets,
);
router.post(
    '/set-project-buget',
    [
        body('BugetName').trim().isString().withMessage('Buget name must be a string').isLength({ max: 100 }).withMessage('Buget name cannot exceed 100 characters'),
        body('ProjectToken')
            .trim()
            .notEmpty()
            .withMessage('Project token is required')
            .isString()
            .withMessage('Project token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Project token must be between 1 and 255 characters'),

        body('TotalBuget').notEmpty().withMessage('Total buget is required').isFloat({ min: 0 }).withMessage('Total buget must be a positive number').toFloat(),

        body('SpentAmount')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Spent amount must be a positive number')
            .toFloat()
            .custom((value, { req }) => {
                if (value > req.body.TotalBuget) {
                    logging.error('SET_PROJECT_BUGET', 'Spent amount cannot exceed total buget');
                    return false;
                }
                return true;
            }),

        body('Currency')
            .optional()
            .trim()
            .isString()
            .withMessage('Currency must be a string')
            .isLength({ min: 3, max: 3 })
            .withMessage('Currency must be a 3-letter code')
            .toUpperCase()
            .isIn(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'RON'])
            .withMessage('Invalid currency code'),

        body('bugetPeriod').optional().trim().isString().withMessage('Buget period must be a string').isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'project']).withMessage('Invalid buget period'),

        body('Notes').optional().trim().isString().withMessage('Notes must be a string').isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
        body('UserSessionToken')
            .trim()
            .notEmpty()
            .withMessage('User session token is required')
            .isString()
            .withMessage('User session token must be a string')
            .isLength({ min: 1, max: 500 })
            .withMessage('User session token is invalid'),
    ],
    BugetServices.SetProjectBuget,
);

router.put(
    '/update-project-buget',
    [
        body('BugetName').optional().trim().isString().withMessage('Buget name must be a string').isLength({ max: 100 }).withMessage('Buget name cannot exceed 100 characters'),

        body('BugetToken')
            .trim()
            .notEmpty()
            .withMessage('Buget token is required')
            .isString()
            .withMessage('Buget token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Buget token must be between 1 and 255 characters'),

        body('UserSessionToken').trim().notEmpty().withMessage('User session token is required').isString().withMessage('User session token must be a string'),

        body('TotalBuget').optional().isFloat({ min: 0 }).withMessage('Total buget must be a positive number').toFloat(),

        body('SpentAmount').optional().isFloat({ min: 0 }).withMessage('Spent amount must be a positive number').toFloat(),

        body('Currency')
            .optional()
            .trim()
            .isString()
            .withMessage('Currency must be a string')
            .isLength({ min: 3, max: 3 })
            .withMessage('Currency must be a 3-letter code')
            .toUpperCase()
            .isIn(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'RON'])
            .withMessage('Invalid currency code'),

        body('BugetPeriod').optional().trim().isString().withMessage('Buget period must be a string').isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'project']).withMessage('Invalid buget period'),

        body('Notes').optional().trim().isString().withMessage('Notes must be a string').isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
    ],
    BugetServices.UpdateProjectBuget,
);


router.delete(
    '/delete-project-buget/:BugetToken/:ProjectToken/:UserSessionToken',
    [
        param('BugetToken')
            .trim()
            .notEmpty()
            .withMessage('Buget token is required')
            .isString()
            .withMessage('Buget token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Buget token must be between 1 and 255 characters'),

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
    BugetServices.DeleteProjectBuget,
);

export = router;
