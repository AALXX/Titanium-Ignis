import express from 'express';
import { body, param, query as queryValidator } from 'express-validator';
import BugetServices from '../services/BugetServices';
import logging from '../config/logging';
import { rbacMiddleware } from '../middlewares/RBAC_Middleware';
const router = express.Router();

import ExpenseServices from '../services/ExpenseServices';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Specify upload directory
        cb(null, process.env.FINANCES_FILE_PATH || 'uploads');
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    },
});

// File filter to accept only specific file types
const fileFilter = (req: any, file: any, cb: any) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'image/jpeg',
        'image/png',
        'image/jpg',
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, Word documents, and images are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
    },
});

router.get(
    '/get-project-expenses/:ProjectToken/:UserSessionToken',
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

        queryValidator('BugetToken').optional().trim().isString().withMessage('Buget token must be a string'),

        queryValidator('Status').optional().trim().isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),

        queryValidator('Category').optional().trim().isIn(['materials', 'labor', 'equipment', 'travel', 'other']).withMessage('Invalid category'),

        queryValidator('StartDate').optional().isISO8601().withMessage('Start date must be a valid date'),

        queryValidator('EndDate').optional().isISO8601().withMessage('End date must be a valid date'),
    ],
    ExpenseServices.GetProjectExpenses,
);

router.post(
    '/add-new-expense',
    [
        body('ProjectToken')
            .trim()
            .notEmpty()
            .withMessage('Project token is required')
            .isString()
            .withMessage('Project token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Project token must be between 1 and 255 characters'),

        body('UserSessionToken').trim().notEmpty().withMessage('User session token is required').isString().withMessage('User session token must be a string'),

        body('BugetToken').optional().trim().isString().withMessage('Buget token must be a string').isLength({ min: 1, max: 255 }).withMessage('Buget token must be between 1 and 255 characters'),

        body('ExpenseTitle')
            .trim()
            .notEmpty()
            .withMessage('Expense name is required')
            .isString()
            .withMessage('Expense name must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Expense name must be between 1 and 255 characters'),

        body('Amount').notEmpty().withMessage('Amount is required').isFloat({ min: 0 }).withMessage('Amount must be a positive number').toFloat(),

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

        body('Category')
            .trim()
            .isString()
            .withMessage('Category must be a string')
            .isIn([
                'personnel', 
                'software_licenses', 
                'hardware', 
                'cloud_services',
                'training', 
                'travel', 
                'office_expenses',
                'outsourcing', 
                'communications',
                'miscellaneous',
                'other' 
            ])
            .withMessage('Invalid category'),

        body('Description').optional().trim().isString().withMessage('Description must be a string').isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

        body('ExpenseDate').isISO8601().withMessage('Expense date must be a valid date'),
    ],
    ExpenseServices.AddNewExpense,
);

router.put(
    '/update-expense',
    [
        body('ExpenseToken')
            .trim()
            .notEmpty()
            .withMessage('Expense token is required')
            .isString()
            .withMessage('Expense token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Expense token must be between 1 and 255 characters'),

        body('UserSessionToken').trim().notEmpty().withMessage('User session token is required').isString().withMessage('User session token must be a string'),

        body('ExpenseName').optional().trim().isString().withMessage('Expense name must be a string').isLength({ min: 1, max: 255 }).withMessage('Expense name must be between 1 and 255 characters'),

        body('Amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number').toFloat(),

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

        body('Category').optional().trim().isString().withMessage('Category must be a string').isIn(['materials', 'labor', 'equipment', 'travel', 'other']).withMessage('Invalid category'),

        body('Description').optional().trim().isString().withMessage('Description must be a string').isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

        body('ExpenseDate').optional().isISO8601().withMessage('Expense date must be a valid date'),
    ],
    ExpenseServices.UpdateExpense,
);

router.delete(
    '/remove-expense/:ExpenseToken/:UserSessionToken',
    [
        param('ExpenseToken')
            .trim()
            .notEmpty()
            .withMessage('Expense token is required')
            .isString()
            .withMessage('Expense token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Expense token must be between 1 and 255 characters'),

        param('UserSessionToken').trim().notEmpty().withMessage('User session token is required').isString().withMessage('User session token must be a string'),
    ],
    ExpenseServices.RemoveExpense,
);

router.post(
    '/approve-expense',
    [
        body('ExpenseToken')
            .trim()
            .notEmpty()
            .withMessage('Expense token is required')
            .isString()
            .withMessage('Expense token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Expense token must be between 1 and 255 characters'),

        body('UserSessionToken').trim().notEmpty().withMessage('User session token is required').isString().withMessage('User session token must be a string'),

        body('Status').trim().notEmpty().withMessage('Status is required').isIn(['approved', 'rejected']).withMessage('Status must be either approved or rejected'),

        body('Notes').optional().trim().isString().withMessage('Notes must be a string').isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
    ],
    ExpenseServices.ApproveExpense,
);

router.post(
    '/upload-receipt',
    upload.single('receipt_file'), 
    [
        body('ExpenseToken')
            .trim()
            .notEmpty()
            .withMessage('Expense token is required')
            .isString()
            .withMessage('Expense token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Expense token must be between 1 and 255 characters'),

        body('UserSessionToken').trim().notEmpty().withMessage('User session token is required').isString().withMessage('User session token must be a string'),
    ],
    ExpenseServices.UploadReceipt,
);

export = router;
