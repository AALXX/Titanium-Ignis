import express from 'express';
import { body, param, query } from 'express-validator';
import logging from '../config/logging';
import { rbacMiddleware } from '../middlewares/RBAC_Middleware';
import InvoicingServices from '../services/InvoicingServices';
const router = express.Router();

router.get(
    '/get-project-invoices/:ProjectToken/:UserSessionToken',
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

        // Optional query filters
        query('Status').optional().trim().isString().withMessage('Status must be a string').isIn(['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled']).withMessage('Invalid status'),

        query('ClientName').optional().trim().isString().withMessage('Client name must be a string'),

        query('BillingType').optional().trim().isString().withMessage('Billing type must be a string').isIn(['fixed-price', 'hourly', 'milestone', 'retainer']).withMessage('Invalid billing type'),

        query('StartDate').optional().isISO8601().withMessage('Start date must be a valid date'),

        query('EndDate').optional().isISO8601().withMessage('End date must be a valid date'),
    ],
    InvoicingServices.GetProjectInvoices,
);

router.post(
    '/add-new-invoice',
    [
        body('ProjectToken')
            .trim()
            .notEmpty()
            .withMessage('Project token is required')
            .isString()
            .withMessage('Project token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Project token must be between 1 and 255 characters'),

        body('UserSessionToken')
            .trim()
            .notEmpty()
            .withMessage('User session token is required')
            .isString()
            .withMessage('User session token must be a string')
            .isLength({ min: 1, max: 500 })
            .withMessage('User session token is invalid'),

        body('ClientName')
            .trim()
            .notEmpty()
            .withMessage('Client name is required')
            .isString()
            .withMessage('Client name must be a string')
            .isLength({ min: 1, max: 100 })
            .withMessage('Client name must be between 1 and 100 characters'),

        body('BillingType').optional().trim().isString().withMessage('Billing type must be a string').isIn(['fixed-price', 'hourly', 'milestone', 'retainer']).withMessage('Invalid billing type'),

        body('IssueDate').optional().isISO8601().withMessage('Issue date must be a valid date').toDate(),

        body('DueDate').optional().isISO8601().withMessage('Due date must be a valid date').toDate(),

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

        body('TaxAmount').optional().isFloat({ min: 0 }).withMessage('Tax amount must be a positive number').toFloat(),

        body('DiscountAmount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be a positive number').toFloat(),

        body('Notes').optional().trim().isString().withMessage('Notes must be a string').isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters'),

        body('Terms').optional().trim().isString().withMessage('Terms must be a string').isLength({ max: 2000 }).withMessage('Terms cannot exceed 2000 characters'),

        body('PaymentInstructions').optional().trim().isString().withMessage('Payment instructions must be a string').isLength({ max: 1000 }).withMessage('Payment instructions cannot exceed 1000 characters'),

        body('LineItems').isArray({ min: 1 }).withMessage('At least one line item is required'),

        body('LineItems.*.Name')
            .trim()
            .notEmpty()
            .withMessage('Line item name is required')
            .isString()
            .withMessage('Line item name must be a string')
            .isLength({ max: 100 })
            .withMessage('Line item name cannot exceed 100 characters'),

        body('LineItems.*.Description')
            .trim()
            .notEmpty()
            .withMessage('Line item description is required')
            .isString()
            .withMessage('Line item description must be a string')
            .isLength({ max: 500 })
            .withMessage('Line item description cannot exceed 500 characters'),

        body('LineItems.*.Quantity').optional().isFloat({ min: 0.01 }).withMessage('Line item quantity must be greater than 0').toFloat(),

        body('LineItems.*.UnitPrice').notEmpty().withMessage('Line item unit price is required').isFloat({ min: 0 }).withMessage('Line item unit price must be a positive number').toFloat(),

        body('LineItems.*.TaxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Line item tax rate must be between 0 and 100').toFloat(),

        body('LineItems.*.ItemType').optional().trim().isString().withMessage('Line item type must be a string').isIn(['service', 'product', 'expense', 'milestone']).withMessage('Invalid line item type'),
    ],
    InvoicingServices.CreateInvoice,
);

router.put(
    '/update-project-invoice',
    [
        body('InvoiceToken')
            .trim()
            .notEmpty()
            .withMessage('Invoice token is required')
            .isString()
            .withMessage('Invoice token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Invoice token must be between 1 and 255 characters'),

        body('UserSessionToken')
            .trim()
            .notEmpty()
            .withMessage('User session token is required')
            .isString()
            .withMessage('User session token must be a string')
            .isLength({ min: 1, max: 500 })
            .withMessage('User session token is invalid'),

        body('ClientName').optional().trim().isString().withMessage('Client name must be a string').isLength({ min: 1, max: 100 }).withMessage('Client name must be between 1 and 100 characters'),

        body('BillingType').optional().trim().isString().withMessage('Billing type must be a string').isIn(['fixed-price', 'hourly', 'milestone', 'retainer']).withMessage('Invalid billing type'),

        body('Status').optional().trim().isString().withMessage('Status must be a string').isIn(['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled']).withMessage('Invalid status'),

        body('IssueDate').optional().isISO8601().withMessage('Issue date must be a valid date').toDate(),

        body('DueDate').optional().isISO8601().withMessage('Due date must be a valid date').toDate(),

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

        body('TaxAmount').optional().isFloat({ min: 0 }).withMessage('Tax amount must be a positive number').toFloat(),

        body('DiscountAmount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be a positive number').toFloat(),

        body('Notes').optional().trim().isString().withMessage('Notes must be a string').isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters'),

        body('Terms').optional().trim().isString().withMessage('Terms must be a string').isLength({ max: 2000 }).withMessage('Terms cannot exceed 2000 characters'),

        body('PaymentInstructions').optional().trim().isString().withMessage('Payment instructions must be a string').isLength({ max: 1000 }).withMessage('Payment instructions cannot exceed 1000 characters'),

        body('LineItems').optional().isArray().withMessage('Line items must be an array'),

        body('LineItems.*.Name').optional().trim().isString().withMessage('Line item name must be a string').isLength({ max: 100 }).withMessage('Line item name cannot exceed 100 characters'),

        body('LineItems.*.Description').optional().trim().isString().withMessage('Line item description must be a string').isLength({ max: 500 }).withMessage('Line item description cannot exceed 500 characters'),

        body('LineItems.*.Quantity').optional().isFloat({ min: 0.01 }).withMessage('Line item quantity must be greater than 0').toFloat(),

        body('LineItems.*.UnitPrice').optional().isFloat({ min: 0 }).withMessage('Line item unit price must be a positive number').toFloat(),

        body('LineItems.*.TaxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Line item tax rate must be between 0 and 100').toFloat(),

        body('LineItems.*.ItemType').optional().trim().isString().withMessage('Line item type must be a string').isIn(['service', 'product', 'expense', 'milestone']).withMessage('Invalid line item type'),
    ],
    InvoicingServices.UpdateProjectInvoices,
);

router.post(
    '/record-payment',
    [
        body('InvoiceToken')
            .trim()
            .notEmpty()
            .withMessage('Invoice token is required')
            .isString()
            .withMessage('Invoice token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Invoice token must be between 1 and 255 characters'),

        body('UserSessionToken')
            .trim()
            .notEmpty()
            .withMessage('User session token is required')
            .isString()
            .withMessage('User session token must be a string')
            .isLength({ min: 1, max: 500 })
            .withMessage('User session token is invalid'),

        body('Amount').notEmpty().withMessage('Payment amount is required').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0').toFloat(),

        body('PaymentDate').optional().isISO8601().withMessage('Payment date must be a valid date').toDate(),

        body('PaymentMethod')
            .trim()
            .notEmpty()
            .withMessage('Payment method is required')
            .isString()
            .withMessage('Payment method must be a string')
            .isIn(['bank_transfer', 'credit_card', 'paypal', 'check', 'cash', 'other'])
            .withMessage('Invalid payment method'),

        body('TransactionId').optional().trim().isString().withMessage('Transaction ID must be a string').isLength({ max: 255 }).withMessage('Transaction ID cannot exceed 255 characters'),

        body('ReferenceNumber').optional().trim().isString().withMessage('Reference number must be a string').isLength({ max: 100 }).withMessage('Reference number cannot exceed 100 characters'),

        body('Notes').optional().trim().isString().withMessage('Notes must be a string').isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
    ],
    InvoicingServices.RecordPayment,
);

router.get(
    '/get-invoice-payments/:InvoiceToken/:UserSessionToken',
    [
        param('InvoiceToken')
            .trim()
            .notEmpty()
            .withMessage('Invoice token is required')
            .isString()
            .withMessage('Invoice token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Invoice token must be between 1 and 255 characters'),

        param('UserSessionToken')
            .trim()
            .notEmpty()
            .withMessage('User session token is required')
            .isString()
            .withMessage('User session token must be a string')
            .isLength({ min: 1, max: 500 })
            .withMessage('User session token is invalid'),
    ],
    InvoicingServices.GetInvoicePayments,
);



router.get(
    '/generate-pdf/:InvoiceToken/:UserSessionToken',
    [
        param('InvoiceToken')
            .trim()
            .notEmpty()
            .withMessage('Invoice token is required')
            .isString()
            .withMessage('Invoice token must be a string')
            .isLength({ min: 1, max: 255 })
            .withMessage('Invoice token must be between 1 and 255 characters'),

        param('UserSessionToken').trim().notEmpty().withMessage('User session token is required').isString().withMessage('User session token must be a string'),
    ],
    InvoicingServices.GeneratePDF,
);

export = router;
