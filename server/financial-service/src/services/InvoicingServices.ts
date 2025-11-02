import { Response } from 'express';
import { validationResult } from 'express-validator';
import logging from '../config/logging';
import { connect, CustomRequest, query } from '../config/postgresql';
import utilFunctions from '../util/utilFunctions';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PoolClient } from 'pg';
import PDFDocument from 'pdfkit';

/**
 * Validates and cleans the CustomRequest form
 */
const CustomRequestValidationResult = validationResult.withDefaults({
    formatter: (error) => {
        return {
            errorMsg: error.msg,
        };
    },
});

const GetProjectInvoices = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECT_INVOICES', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('GET_PROJECT_INVOICES', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { ProjectToken, UserSessionToken } = req.params;
        const { Status, ClientName, StartDate, EndDate, BillingType } = req.query;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('GET_PROJECT_INVOICES', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const userPublicToken = await utilFunctions.getUserPublicTokenFromPrivateToken(connection, userPrivateToken);

        if (!userPublicToken) {
            connection.release();
            logging.error('GET_PROJECT_INVOICES', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const projectExists = await utilFunctions.checkProjectExists(connection, ProjectToken);
        if (!projectExists) {
            connection.release();
            logging.error('GET_PROJECT_INVOICES', `Project not found: ${ProjectToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Project not found',
            });
            return;
        }

        let getInvoicesQuery = `
            SELECT 
                i.id,
                i.invoice_token,
                i.project_token,
                i.client_name,
                i.billing_type,
                i.total_amount,
                i.subtotal,
                i.tax_amount,
                i.discount_amount,
                i.status,
                i.issue_date,
                i.due_date,
                i.sent_date,
                i.paid_date,
                i.currency,
                i.notes,
                i.terms,
                i.payment_instructions,
                i.created_by,
                i.created_at,
                i.updated_at,
                u.UserName as created_by_name
            FROM invoices i
            LEFT JOIN users u ON i.created_by = u.UserPrivateToken
            WHERE i.project_token = $1
        `;

        const queryParams: any[] = [ProjectToken];
        let paramCounter = 2;

        if (Status) {
            getInvoicesQuery += ` AND i.status = $${paramCounter++}`;
            queryParams.push(Status);
        }

        if (ClientName) {
            getInvoicesQuery += ` AND i.client_name ILIKE $${paramCounter++}`;
            queryParams.push(`%${ClientName}%`);
        }

        if (BillingType) {
            getInvoicesQuery += ` AND i.billing_type = $${paramCounter++}`;
            queryParams.push(BillingType);
        }

        if (StartDate) {
            getInvoicesQuery += ` AND i.issue_date >= $${paramCounter++}`;
            queryParams.push(StartDate);
        }

        if (EndDate) {
            getInvoicesQuery += ` AND i.issue_date <= $${paramCounter++}`;
            queryParams.push(EndDate);
        }

        getInvoicesQuery += ` ORDER BY i.issue_date DESC NULLS LAST, i.created_at DESC`;

        const invoicesResult = await query(connection, getInvoicesQuery, queryParams);

        if (!invoicesResult || invoicesResult.length === 0) {
            connection.release();
            res.status(200).json({
                error: false,
                message: 'No invoices found for this project',
                data: {
                    ProjectToken,
                    invoices: [],
                    totalInvoices: 0,
                    summary: {
                        TotalAmount: 0,
                        DraftAmount: 0,
                        SentAmount: 0,
                        PaidAmount: 0,
                        OverdueAmount: 0,
                    },
                },
            });
            return;
        }

        const invoiceTokens = invoicesResult.map((inv: any) => inv.invoice_token);
        const lineItemsQuery = `
            SELECT 
                invoice_token,
                id,
                description,
                quantity,
                unit_price,
                amount,
                tax_rate,
                tax_amount,
                item_type,
                created_at,
                updated_at
            FROM invoice_line_items
            WHERE invoice_token = ANY($1)
            ORDER BY id ASC
        `;

        const lineItemsResult = await query(connection, lineItemsQuery, [invoiceTokens]);
        connection.release();

        const lineItemsByInvoice: { [key: string]: any[] } = {};
        if (lineItemsResult) {
            lineItemsResult.forEach((item: any) => {
                if (!lineItemsByInvoice[item.invoice_token]) {
                    lineItemsByInvoice[item.invoice_token] = [];
                }
                lineItemsByInvoice[item.invoice_token].push({
                    LineItemId: item.id,
                    Description: item.description,
                    Quantity: parseFloat(item.quantity),
                    UnitPrice: parseFloat(item.unit_price),
                    Amount: parseFloat(item.amount),
                    TaxRate: parseFloat(item.tax_rate),
                    TaxAmount: parseFloat(item.tax_amount),
                    ItemType: item.item_type,
                    CreatedAt: item.created_at,
                    UpdatedAt: item.updated_at,
                });
            });
        }

        const totalAmount = invoicesResult.reduce((sum: number, inv: any) => sum + parseFloat(inv.total_amount), 0);
        const draftAmount = invoicesResult.filter((inv: any) => inv.status === 'draft').reduce((sum: number, inv: any) => sum + parseFloat(inv.total_amount), 0);
        const sentAmount = invoicesResult.filter((inv: any) => inv.status === 'sent').reduce((sum: number, inv: any) => sum + parseFloat(inv.total_amount), 0);
        const paidAmount = invoicesResult.filter((inv: any) => inv.status === 'paid').reduce((sum: number, inv: any) => sum + parseFloat(inv.total_amount), 0);

        const currentDate = new Date();
        const overdueAmount = invoicesResult
            .filter((inv: any) => (inv.status === 'sent' || inv.status === 'overdue') && inv.due_date && new Date(inv.due_date) < currentDate)
            .reduce((sum: number, inv: any) => sum + parseFloat(inv.total_amount), 0);

        const formattedInvoices = invoicesResult.map((invoice: any) => ({
            InvoiceId: invoice.id,
            InvoiceToken: invoice.invoice_token,
            ProjectToken: invoice.project_token,
            ClientName: invoice.client_name,
            BillingType: invoice.billing_type,
            TotalAmount: parseFloat(invoice.total_amount),
            Subtotal: parseFloat(invoice.subtotal),
            TaxAmount: parseFloat(invoice.tax_amount),
            DiscountAmount: parseFloat(invoice.discount_amount),
            Status: invoice.status,
            IssueDate: invoice.issue_date,
            DueDate: invoice.due_date,
            SentDate: invoice.sent_date,
            PaidDate: invoice.paid_date,
            Currency: invoice.currency,
            Notes: invoice.notes,
            Terms: invoice.terms,
            PaymentInstructions: invoice.payment_instructions,
            CreatedBy: invoice.created_by,
            CreatedByName: invoice.created_by_name,
            CreatedAt: invoice.created_at,
            UpdatedAt: invoice.updated_at,
            LineItems: lineItemsByInvoice[invoice.invoice_token] || [],
        }));

        res.status(200).json({
            error: false,
            message: 'Invoices retrieved successfully',
            data: {
                ProjectToken,
                invoices: formattedInvoices,
                totalInvoices: invoicesResult.length,
                summary: {
                    TotalAmount: totalAmount,
                    DraftAmount: draftAmount,
                    SentAmount: sentAmount,
                    PaidAmount: paidAmount,
                    OverdueAmount: overdueAmount,
                },
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }

        logging.error('GET_PROJECT_INVOICES', error.message);

        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const CreateInvoice = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('CREATE_INVOICE', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    console.log('CUm');
    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('CREATE_INVOICE', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { ProjectToken, UserSessionToken, ClientName, BillingType, IssueDate, DueDate, Currency, Notes, Terms, PaymentInstructions, LineItems, TaxAmount, DiscountAmount } = req.body;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('CREATE_INVOICE', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const userPublicToken = await utilFunctions.getUserPublicTokenFromPrivateToken(connection, userPrivateToken);

        const projectExists = await utilFunctions.checkProjectExists(connection, ProjectToken);
        if (!projectExists) {
            connection.release();
            logging.error('CREATE_INVOICE', `Project not found: ${ProjectToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Project not found',
            });
            return;
        }

        if (!LineItems || !Array.isArray(LineItems) || LineItems.length === 0) {
            connection.release();
            logging.error('CREATE_INVOICE', 'At least one line item is required');
            res.status(200).json({
                error: true,
                errmsg: 'At least one line item is required',
            });
            return;
        }

        let calculatedSubtotal = 0;
        for (const item of LineItems) {
            const quantity = parseFloat(item.Quantity || 1);
            const unitPrice = parseFloat(item.UnitPrice || 0);
            const amount = quantity * unitPrice;
            calculatedSubtotal += amount;
        }

        const taxAmountValue = parseFloat(TaxAmount || 0);
        const discountAmountValue = parseFloat(DiscountAmount || 0);
        const totalAmount = calculatedSubtotal + taxAmountValue - discountAmountValue;

        if (totalAmount < 0) {
            connection.release();
            logging.error('CREATE_INVOICE', 'Total amount cannot be negative');
            res.status(200).json({
                error: true,
                errmsg: 'Total amount cannot be negative',
            });
            return;
        }

        // Validate dates
        if (DueDate && IssueDate && new Date(DueDate) < new Date(IssueDate)) {
            connection.release();
            logging.error('CREATE_INVOICE', 'Due date cannot be before issue date');
            res.status(200).json({
                error: true,
                errmsg: 'Due date cannot be before issue date',
            });
            return;
        }

        const invoiceToken = utilFunctions.CreateToken();

        await query(connection, 'BEGIN', []);

        try {
            const insertInvoiceQuery = `
                INSERT INTO invoices 
                    (invoice_token, project_token, client_name, billing_type, total_amount, 
                     subtotal, tax_amount, discount_amount, issue_date, due_date, 
                     currency, notes, terms, payment_instructions, created_by)
                VALUES 
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *
            `;
            const invoiceParams = [
                invoiceToken,
                ProjectToken,
                ClientName,
                BillingType || 'fixed-price',
                totalAmount,
                calculatedSubtotal,
                taxAmountValue,
                discountAmountValue,
                IssueDate || null,
                DueDate || null,
                Currency || 'EUR',
                Notes || null,
                Terms || null,
                PaymentInstructions || null,
                userPrivateToken,
            ];

            const invoiceResult = await query(connection, insertInvoiceQuery, invoiceParams);

            if (!invoiceResult || invoiceResult.length === 0) {
                await query(connection, 'ROLLBACK', []);
                connection.release();
                logging.error('CREATE_INVOICE', 'Failed to create invoice');
                res.status(200).json({
                    error: true,
                    errmsg: 'Failed to create invoice',
                });
                return;
            }

            const insertLineItemQuery = `
                INSERT INTO invoice_line_items 
                    (name, invoice_token, description, quantity, unit_price, amount, 
                     tax_rate, tax_amount, item_type)
                VALUES 
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

            const createdLineItems = [];
            for (const item of LineItems) {
                const quantity = parseFloat(item.Quantity || 1);
                const unitPrice = parseFloat(item.UnitPrice || 0);
                const amount = quantity * unitPrice;
                const taxRate = parseFloat(item.TaxRate || 0);
                const itemTaxAmount = (amount * taxRate) / 100;
                const lineItemParams = [item.Name, invoiceToken, item.Description, quantity, unitPrice, amount, taxRate, itemTaxAmount, item.ItemType || 'service'];

                const lineItemResult = await query(connection, insertLineItemQuery, lineItemParams);

                if (!lineItemResult || lineItemResult.length === 0) {
                    await query(connection, 'ROLLBACK', []);
                    connection.release();
                    logging.error('CREATE_INVOICE', 'Failed to create line item');
                    res.status(200).json({
                        error: true,
                        errmsg: 'Failed to create line item',
                    });
                    return;
                }

                createdLineItems.push({
                    LineItemId: lineItemResult[0].id,
                    Name: lineItemResult[0].name,
                    Description: lineItemResult[0].description,
                    Quantity: parseFloat(lineItemResult[0].quantity),
                    UnitPrice: parseFloat(lineItemResult[0].unit_price),
                    Amount: parseFloat(lineItemResult[0].amount),
                    TaxRate: parseFloat(lineItemResult[0].tax_rate),
                    TaxAmount: parseFloat(lineItemResult[0].tax_amount),
                    ItemType: lineItemResult[0].item_type,
                    CreatedAt: lineItemResult[0].created_at,
                    UpdatedAt: lineItemResult[0].updated_at,
                });
            }

            await query(connection, 'COMMIT', []);
            connection.release();

            const invoice = invoiceResult[0];

            res.status(200).json({
                error: false,
                message: 'Invoice created successfully',
                data: {
                    InvoiceId: invoice.id,
                    InvoiceToken: invoice.invoice_token,
                    ProjectToken: invoice.project_token,
                    ClientName: invoice.client_name,
                    BillingType: invoice.billing_type,
                    TotalAmount: parseFloat(invoice.total_amount),
                    Subtotal: parseFloat(invoice.subtotal),
                    TaxAmount: parseFloat(invoice.tax_amount),
                    DiscountAmount: parseFloat(invoice.discount_amount),
                    Status: invoice.status,
                    IssueDate: invoice.issue_date,
                    DueDate: invoice.due_date,
                    Currency: invoice.currency,
                    Notes: invoice.notes,
                    Terms: invoice.terms,
                    PaymentInstructions: invoice.payment_instructions,
                    CreatedBy: invoice.created_by,
                    UserPublicToken: userPublicToken,
                    CreatedAt: invoice.created_at,
                    UpdatedAt: invoice.updated_at,
                    LineItems: createdLineItems,
                },
            });
        } catch (transactionError: any) {
            await query(connection, 'ROLLBACK', []);
            throw transactionError;
        }
    } catch (error: any) {
        if (connection) {
            connection.release();
        }

        logging.error('CREATE_INVOICE', error.message);

        let errorMessage = error.message;

        if (error.code === '23503') {
            errorMessage = 'Project does not exist';
        } else if (error.code === '23514') {
            errorMessage = 'Invalid amount values';
        } else if (error.code === '23505') {
            errorMessage = 'Invoice token already exists';
        }

        res.status(200).json({
            error: true,
            errmsg: errorMessage,
        });
    }
};

const UpdateProjectInvoices = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('UPDATE_PROJECT_INVOICES', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('UPDATE_PROJECT_INVOICES', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { InvoiceToken, UserSessionToken, ClientName, BillingType, IssueDate, DueDate, Currency, Notes, Terms, PaymentInstructions, LineItems, TaxAmount, DiscountAmount } = req.body;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('UPDATE_PROJECT_INVOICES', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const userPublicToken = await utilFunctions.getUserPublicTokenFromPrivateToken(connection, userPrivateToken);

        // Check if invoice exists
        const checkInvoiceQuery = `
            SELECT id, invoice_token, project_token, status, total_amount
            FROM invoices 
            WHERE invoice_token = $1
        `;
        const invoiceResult = await query(connection, checkInvoiceQuery, [InvoiceToken]);

        if (!invoiceResult || invoiceResult.length === 0) {
            connection.release();
            logging.error('UPDATE_PROJECT_INVOICES', `Invoice not found: ${InvoiceToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Invoice not found',
            });
            return;
        }

        const existingInvoice = invoiceResult[0];

        // Only draft invoices can be fully updated
        if (existingInvoice.status !== 'draft') {
            connection.release();
            logging.error('UPDATE_PROJECT_INVOICES', 'Only draft invoices can be updated');
            res.status(200).json({
                error: true,
                errmsg: 'Only draft invoices can be updated',
            });
            return;
        }

        // Validate dates if both are provided
        if (DueDate && IssueDate && new Date(DueDate) < new Date(IssueDate)) {
            connection.release();
            logging.error('UPDATE_PROJECT_INVOICES', 'Due date cannot be before issue date');
            res.status(200).json({
                error: true,
                errmsg: 'Due date cannot be before issue date',
            });
            return;
        }

        // Begin transaction
        await query(connection, 'BEGIN', []);

        try {
            let calculatedSubtotal = 0;
            let updatedLineItems = [];

            // Handle line items update if provided
            if (LineItems && Array.isArray(LineItems) && LineItems.length > 0) {
                // Delete existing line items
                const deleteLineItemsQuery = `
                    DELETE FROM invoice_line_items
                    WHERE invoice_token = $1
                `;
                await query(connection, deleteLineItemsQuery, [InvoiceToken]);

                // Insert new line items
                const insertLineItemQuery = `
                    INSERT INTO invoice_line_items 
                        (invoice_token, name, description, quantity, unit_price, amount, 
                         tax_rate, tax_amount, item_type)
                    VALUES 
                        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING *
                `;

                for (const item of LineItems) {
                    const quantity = parseFloat(item.Quantity || 1);
                    const unitPrice = parseFloat(item.UnitPrice || 0);
                    const amount = quantity * unitPrice;
                    const taxRate = parseFloat(item.TaxRate || 0);
                    const itemTaxAmount = (amount * taxRate) / 100;

                    calculatedSubtotal += amount;

                    const lineItemParams = [InvoiceToken, item.Name || '', item.Description, quantity, unitPrice, amount, taxRate, itemTaxAmount, item.ItemType || 'service'];

                    const lineItemResult = await query(connection, insertLineItemQuery, lineItemParams);

                    if (!lineItemResult || lineItemResult.length === 0) {
                        await query(connection, 'ROLLBACK', []);
                        connection.release();
                        logging.error('UPDATE_PROJECT_INVOICES', 'Failed to create line item');
                        res.status(200).json({
                            error: true,
                            errmsg: 'Failed to create line item',
                        });
                        return;
                    }

                    updatedLineItems.push({
                        LineItemId: lineItemResult[0].id,
                        Name: lineItemResult[0].name,
                        Description: lineItemResult[0].description,
                        Quantity: parseFloat(lineItemResult[0].quantity),
                        UnitPrice: parseFloat(lineItemResult[0].unit_price),
                        Amount: parseFloat(lineItemResult[0].amount),
                        TaxRate: parseFloat(lineItemResult[0].tax_rate),
                        TaxAmount: parseFloat(lineItemResult[0].tax_amount),
                        ItemType: lineItemResult[0].item_type,
                        CreatedAt: lineItemResult[0].created_at,
                        UpdatedAt: lineItemResult[0].updated_at,
                    });
                }
            } else {
                // If line items not provided, calculate subtotal from existing items
                const existingLineItemsQuery = `
                    SELECT SUM(amount) as subtotal
                    FROM invoice_line_items
                    WHERE invoice_token = $1
                `;
                const subtotalResult = await query(connection, existingLineItemsQuery, [InvoiceToken]);
                calculatedSubtotal = subtotalResult && subtotalResult[0] ? parseFloat(subtotalResult[0].subtotal || 0) : 0;
            }

            // Build dynamic update query for invoice
            const updateFields: string[] = [];
            const updateValues: any[] = [];
            let paramCounter = 1;

            if (ClientName !== undefined) {
                updateFields.push(`client_name = $${paramCounter++}`);
                updateValues.push(ClientName);
            }

            if (BillingType !== undefined) {
                updateFields.push(`billing_type = $${paramCounter++}`);
                updateValues.push(BillingType);
            }

            if (IssueDate !== undefined) {
                updateFields.push(`issue_date = $${paramCounter++}`);
                updateValues.push(IssueDate);
            }

            if (DueDate !== undefined) {
                updateFields.push(`due_date = $${paramCounter++}`);
                updateValues.push(DueDate);
            }

            if (Currency !== undefined) {
                updateFields.push(`currency = $${paramCounter++}`);
                updateValues.push(Currency);
            }

            if (Notes !== undefined) {
                updateFields.push(`notes = $${paramCounter++}`);
                updateValues.push(Notes);
            }

            if (Terms !== undefined) {
                updateFields.push(`terms = $${paramCounter++}`);
                updateValues.push(Terms);
            }

            if (PaymentInstructions !== undefined) {
                updateFields.push(`payment_instructions = $${paramCounter++}`);
                updateValues.push(PaymentInstructions);
            }

            // Calculate totals
            const taxAmountValue = TaxAmount !== undefined ? parseFloat(TaxAmount) : 0;
            const discountAmountValue = DiscountAmount !== undefined ? parseFloat(DiscountAmount) : 0;

            // If line items were updated or tax/discount changed, recalculate totals
            if (LineItems || TaxAmount !== undefined || DiscountAmount !== undefined) {
                const totalAmount = calculatedSubtotal + taxAmountValue - discountAmountValue;

                if (totalAmount < 0) {
                    await query(connection, 'ROLLBACK', []);
                    connection.release();
                    logging.error('UPDATE_PROJECT_INVOICES', 'Total amount cannot be negative');
                    res.status(200).json({
                        error: true,
                        errmsg: 'Total amount cannot be negative',
                    });
                    return;
                }

                updateFields.push(`subtotal = $${paramCounter++}`);
                updateValues.push(calculatedSubtotal);

                updateFields.push(`tax_amount = $${paramCounter++}`);
                updateValues.push(taxAmountValue);

                updateFields.push(`discount_amount = $${paramCounter++}`);
                updateValues.push(discountAmountValue);

                updateFields.push(`total_amount = $${paramCounter++}`);
                updateValues.push(totalAmount);
            }

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

            if (updateFields.length === 1) {
                await query(connection, 'ROLLBACK', []);
                connection.release();
                logging.error('UPDATE_PROJECT_INVOICES', 'No fields to update');
                res.status(200).json({
                    error: true,
                    errmsg: 'No fields to update',
                });
                return;
            }

            updateValues.push(InvoiceToken);

            const updateInvoiceQuery = `
                UPDATE invoices 
                SET ${updateFields.join(', ')}
                WHERE invoice_token = $${paramCounter}
                RETURNING *
            `;

            const updateResult = await query(connection, updateInvoiceQuery, updateValues);

            if (!updateResult || updateResult.length === 0) {
                await query(connection, 'ROLLBACK', []);
                connection.release();
                logging.error('UPDATE_PROJECT_INVOICES', 'Failed to update invoice');
                res.status(200).json({
                    error: true,
                    errmsg: 'Failed to update invoice',
                });
                return;
            }

            // If line items weren't updated in this request, fetch existing ones
            if (!LineItems || LineItems.length === 0) {
                const fetchLineItemsQuery = `
                    SELECT *
                    FROM invoice_line_items
                    WHERE invoice_token = $1
                    ORDER BY id ASC
                `;
                const existingItems = await query(connection, fetchLineItemsQuery, [InvoiceToken]);

                if (existingItems) {
                    updatedLineItems = existingItems.map((item: any) => ({
                        LineItemId: item.id,
                        Name: item.name,
                        Description: item.description,
                        Quantity: parseFloat(item.quantity),
                        UnitPrice: parseFloat(item.unit_price),
                        Amount: parseFloat(item.amount),
                        TaxRate: parseFloat(item.tax_rate),
                        TaxAmount: parseFloat(item.tax_amount),
                        ItemType: item.item_type,
                        CreatedAt: item.created_at,
                        UpdatedAt: item.updated_at,
                    }));
                }
            }

            // Commit transaction
            await query(connection, 'COMMIT', []);
            connection.release();

            const invoice = updateResult[0];

            res.status(200).json({
                error: false,
                message: 'Invoice updated successfully',
                data: {
                    InvoiceId: invoice.id,
                    InvoiceToken: invoice.invoice_token,
                    ProjectToken: invoice.project_token,
                    ClientName: invoice.client_name,
                    BillingType: invoice.billing_type,
                    TotalAmount: parseFloat(invoice.total_amount),
                    Subtotal: parseFloat(invoice.subtotal),
                    TaxAmount: parseFloat(invoice.tax_amount),
                    DiscountAmount: parseFloat(invoice.discount_amount),
                    Status: invoice.status,
                    IssueDate: invoice.issue_date,
                    DueDate: invoice.due_date,
                    Currency: invoice.currency,
                    Notes: invoice.notes,
                    Terms: invoice.terms,
                    PaymentInstructions: invoice.payment_instructions,
                    CreatedBy: invoice.created_by,
                    UserPublicToken: userPublicToken,
                    CreatedAt: invoice.created_at,
                    UpdatedAt: invoice.updated_at,
                    LineItems: updatedLineItems,
                },
            });
        } catch (transactionError: any) {
            await query(connection, 'ROLLBACK', []);
            throw transactionError;
        }
    } catch (error: any) {
        if (connection) {
            connection.release();
        }

        logging.error('UPDATE_PROJECT_INVOICES', error.message);

        let errorMessage = error.message;

        if (error.code === '23514') {
            errorMessage = 'Invalid amount values';
        } else if (error.code === '23503') {
            errorMessage = 'Referenced entity does not exist';
        }

        res.status(200).json({
            error: true,
            errmsg: errorMessage,
        });
    }
};


const GeneratePDF = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GENERATE_PDF', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('GENERATE_PDF', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { InvoiceToken, UserSessionToken } = req.params;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('GENERATE_PDF', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const invoiceQuery = `
            SELECT 
                i.id,
                i.invoice_token,
                i.project_token,
                i.client_name,
                i.billing_type,
                i.total_amount,
                i.subtotal,
                i.tax_amount,
                i.discount_amount,
                i.status,
                i.issue_date,
                i.due_date,
                i.currency,
                i.notes,
                i.terms,
                i.payment_instructions,
                i.created_at,
                p.projectname as project_name,
                u.UserName as created_by_name,
                u.UserEmail as created_by_email
            FROM invoices i
            LEFT JOIN projects p ON i.project_token = p.projecttoken
            LEFT JOIN users u ON i.created_by = u.UserPrivateToken
            WHERE i.invoice_token = $1
        `;

        const invoiceResult = await query(connection, invoiceQuery, [InvoiceToken]);

        if (!invoiceResult || invoiceResult.length === 0) {
            connection.release();
            logging.error('GENERATE_PDF', `Invoice not found: ${InvoiceToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Invoice not found',
            });
            return;
        }

        const invoice = invoiceResult[0];

        const lineItemsQuery = `
            SELECT 
                id,
                name,
                description,
                quantity,
                unit_price,
                amount,
                tax_rate,
                tax_amount,
                item_type
            FROM invoice_line_items
            WHERE invoice_token = $1
            ORDER BY id ASC
        `;

        const lineItemsResult = await query(connection, lineItemsQuery, [InvoiceToken]);
        connection.release();

        if (!lineItemsResult || lineItemsResult.length === 0) {
            logging.error('GENERATE_PDF', 'No line items found for invoice');
            res.status(200).json({
                error: true,
                errmsg: 'No line items found for invoice',
            });
            return;
        }

        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        const invoiceNumber = invoice.id.toString().padStart(6, '0');
        const filename = `invoice-${invoiceNumber}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        const primaryColor = '#2563eb';
        const secondaryColor = '#64748b';
        const textColor = '#1e293b';
        const lightGray = '#f1f5f9';

        doc.fontSize(28).fillColor(primaryColor).text('INVOICE', 50, 50, { align: 'left' });

        doc.fontSize(10).fillColor(secondaryColor).text(`Invoice #${invoiceNumber}`, 50, 85);

        const rightAlign = 400;
        doc.fontSize(12).fillColor(textColor).text('Your Company Name', rightAlign, 50, { align: 'right' });

        doc.fontSize(9)
            .fillColor(secondaryColor)
            .text('Your Company Address', rightAlign, 70, { align: 'right' })
            .text('City, State, ZIP', rightAlign, 85, { align: 'right' })
            .text('Phone: +1 (555) 123-4567', rightAlign, 100, { align: 'right' })
            .text('Email: billing@company.com', rightAlign, 115, { align: 'right' });

        doc.strokeColor(lightGray).lineWidth(1).moveTo(50, 140).lineTo(545, 140).stroke();

        let yPosition = 160;

        doc.fontSize(10).fillColor(secondaryColor).text('BILL TO:', 50, yPosition);

        doc.fontSize(11)
            .fillColor(textColor)
            .text(invoice.client_name, 50, yPosition + 20);

        doc.fontSize(9)
            .fillColor(secondaryColor)
            .text(`Project: ${invoice.project_name || 'N/A'}`, 50, yPosition + 40);

        doc.fontSize(9).fillColor(secondaryColor).text('Invoice Date:', rightAlign, yPosition, { align: 'right' });

        doc.fillColor(textColor).text(invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : 'N/A', rightAlign, yPosition + 15, { align: 'right' });

        doc.fillColor(secondaryColor).text('Due Date:', rightAlign, yPosition + 35, { align: 'right' });

        doc.fillColor(textColor).text(invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A', rightAlign, yPosition + 50, { align: 'right' });

        doc.fillColor(secondaryColor).text('Status:', rightAlign, yPosition + 70, { align: 'right' });

        const statusColor = invoice.status === 'paid' ? '#10b981' : invoice.status === 'sent' ? '#f59e0b' : invoice.status === 'draft' ? '#64748b' : '#ef4444';

        doc.fillColor(statusColor).text(invoice.status.toUpperCase(), rightAlign, yPosition + 85, { align: 'right' });

        yPosition = 280;

        doc.rect(50, yPosition, 495, 30).fill(lightGray);

        doc.fontSize(9)
            .fillColor(textColor)
            .text('ITEM', 60, yPosition + 10)
            .text('QTY', 300, yPosition + 10, { width: 50, align: 'right' })
            .text('UNIT PRICE', 360, yPosition + 10, { width: 70, align: 'right' })
            .text('AMOUNT', 440, yPosition + 10, { width: 95, align: 'right' });

        yPosition += 30;

        lineItemsResult.forEach((item: any, index: number) => {
            if (yPosition > 700) {
                doc.addPage();
                yPosition = 50;
            }

            const rowHeight = 40;
            const startY = yPosition;

            if (index % 2 === 0) {
                doc.rect(50, yPosition, 495, rowHeight).fill('#fafafa');
            }

            doc.fillColor(textColor)
                .fontSize(10)
                .text(item.name || 'Service', 60, yPosition + 8, { width: 220 });

            doc.fontSize(8)
                .fillColor(secondaryColor)
                .text(item.description, 60, yPosition + 23, { width: 220, height: 15, ellipsis: true });

            doc.fontSize(9)
                .fillColor(textColor)
                .text(parseFloat(item.quantity).toFixed(2), 300, yPosition + 12, { width: 50, align: 'right' })
                .text(`${invoice.currency} ${parseFloat(item.unit_price).toFixed(2)}`, 360, yPosition + 12, { width: 70, align: 'right' })
                .text(`${invoice.currency} ${parseFloat(item.amount).toFixed(2)}`, 440, yPosition + 12, { width: 95, align: 'right' });

            yPosition += rowHeight;
        });

        yPosition += 10;
        doc.strokeColor(lightGray).lineWidth(1).moveTo(50, yPosition).lineTo(545, yPosition).stroke();

        yPosition += 20;

        doc.fontSize(9).fillColor(secondaryColor).text('Subtotal:', 350, yPosition, { width: 90, align: 'right' });

        doc.fillColor(textColor).text(`${invoice.currency} ${parseFloat(invoice.subtotal).toFixed(2)}`, 440, yPosition, { width: 95, align: 'right' });

        yPosition += 20;

        if (parseFloat(invoice.discount_amount) > 0) {
            doc.fillColor(secondaryColor).text('Discount:', 350, yPosition, { width: 90, align: 'right' });

            doc.fillColor('#ef4444').text(`-${invoice.currency} ${parseFloat(invoice.discount_amount).toFixed(2)}`, 440, yPosition, { width: 95, align: 'right' });

            yPosition += 20;
        }

        if (parseFloat(invoice.tax_amount) > 0) {
            doc.fillColor(secondaryColor).text('Tax:', 350, yPosition, { width: 90, align: 'right' });

            doc.fillColor(textColor).text(`${invoice.currency} ${parseFloat(invoice.tax_amount).toFixed(2)}`, 440, yPosition, { width: 95, align: 'right' });

            yPosition += 20;
        }

        doc.strokeColor(primaryColor).lineWidth(2).moveTo(350, yPosition).lineTo(545, yPosition).stroke();

        yPosition += 15;

        doc.fontSize(12).fillColor(textColor).text('TOTAL:', 350, yPosition, { width: 90, align: 'right' });

        doc.fontSize(14)
            .fillColor(primaryColor)
            .text(`${invoice.currency} ${parseFloat(invoice.total_amount).toFixed(2)}`, 440, yPosition, { width: 95, align: 'right' });

        if (invoice.notes) {
            yPosition += 50;

            if (yPosition > 650) {
                doc.addPage();
                yPosition = 50;
            }

            doc.fontSize(10).fillColor(secondaryColor).text('NOTES:', 50, yPosition);

            doc.fontSize(9)
                .fillColor(textColor)
                .text(invoice.notes, 50, yPosition + 20, { width: 495, align: 'left' });
        }

        if (invoice.terms) {
            yPosition += invoice.notes ? 80 : 50;

            if (yPosition > 650) {
                doc.addPage();
                yPosition = 50;
            }

            doc.fontSize(10).fillColor(secondaryColor).text('TERMS & CONDITIONS:', 50, yPosition);

            doc.fontSize(9)
                .fillColor(textColor)
                .text(invoice.terms, 50, yPosition + 20, { width: 495, align: 'left' });
        }

        if (invoice.payment_instructions) {
            yPosition += invoice.terms ? 80 : 50;

            if (yPosition > 650) {
                doc.addPage();
                yPosition = 50;
            }

            doc.fontSize(10).fillColor(secondaryColor).text('PAYMENT INSTRUCTIONS:', 50, yPosition);

            doc.fontSize(9)
                .fillColor(textColor)
                .text(invoice.payment_instructions, 50, yPosition + 20, { width: 495, align: 'left' });
        }

        const footerY = 750;
        doc.fontSize(8).fillColor(secondaryColor).text('Thank you for your business!', 50, footerY, { align: 'center', width: 495 });

        doc.fontSize(7).text(`Generated on ${new Date().toLocaleString()}`, 50, footerY + 15, { align: 'center', width: 495 });

        doc.end();

    } catch (error: any) {
        if (connection) {
            connection.release();
        }

        logging.error('GENERATE_PDF', error.message);

        if (!res.headersSent) {
            res.status(200).json({
                error: true,
                errmsg: error.message,
            });
        }
    }
};

export default {
    GetProjectInvoices,
    CreateInvoice,
    UpdateProjectInvoices,
    GeneratePDF,
};
