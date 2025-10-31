import { Response } from 'express';
import { validationResult } from 'express-validator';
import logging from '../config/logging';
import { connect, CustomRequest, query } from '../config/postgresql';
import utilFunctions from '../util/utilFunctions';
import { PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

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

const checkExpenseExists = async (connection: PoolClient, expenseToken: string): Promise<any> => {
    const checkQuery = `
        SELECT id, expenses_title, ProjectToken, expense_token, category, user_private_token, 
               amount, status, expense_date, description, receipt_url, approval_date, 
               approved_by, rejection_reason, reimbursement_date, created_at, updated_at
        FROM project_expenses 
        WHERE expense_token = $1
    `;
    const expenseResult = await query(connection, checkQuery, [expenseToken]);
    return expenseResult && expenseResult.length > 0 ? expenseResult[0] : null;
};

const GetProjectExpenses = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECT_EXPENSES', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('GET_PROJECT_EXPENSES', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { ProjectToken, UserSessionToken } = req.params;
        const { Category, Status, StartDate, EndDate } = req.query;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('GET_PROJECT_EXPENSES', 'Invalid user session token');
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
            logging.error('GET_PROJECT_EXPENSES', `Project not found: ${ProjectToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Project not found',
            });
            return;
        }

        let getExpensesQuery = `
            SELECT 
                e.id,
                e.expenses_title,
                e.ProjectToken,
                e.buget_token,
                e.expense_token,
                e.category,
                e.user_private_token,
                e.amount,
                e.expense_date,
                e.description,
                e.receipt_url,
                e.status,
                e.approval_date,
                e.approved_by,
                e.rejection_reason,
                e.reimbursement_date,
                e.created_at,
                e.updated_at,
                u.UserName as created_by_name,
                approver.UserName as approved_by_name
            FROM project_expenses e
            LEFT JOIN users u ON e.user_private_token = u.UserPrivateToken
            LEFT JOIN users approver ON e.approved_by = approver.UserPrivateToken
            WHERE e.ProjectToken = $1
        `;

        const queryParams: any[] = [ProjectToken];
        let paramCounter = 2;

        if (Category) {
            getExpensesQuery += ` AND e.category = $${paramCounter++}`;
            queryParams.push(Category);
        }

        if (Status) {
            getExpensesQuery += ` AND e.status = $${paramCounter++}`;
            queryParams.push(Status);
        }

        if (StartDate) {
            getExpensesQuery += ` AND e.expense_date >= $${paramCounter++}`;
            queryParams.push(StartDate);
        }

        if (EndDate) {
            getExpensesQuery += ` AND e.expense_date <= $${paramCounter++}`;
            queryParams.push(EndDate);
        }

        getExpensesQuery += ` ORDER BY e.expense_date DESC, e.created_at DESC`;

        const expensesResult = await query(connection, getExpensesQuery, queryParams);
        connection.release();

        if (!expensesResult || expensesResult.length === 0) {
            res.status(200).json({
                error: false,
                message: 'No expenses found for this project',
                data: {
                    ProjectToken,
                    expenses: [],
                    totalExpenses: 0,
                    summary: {
                        TotalAmount: 0,
                        PendingAmount: 0,
                        ApprovedAmount: 0,
                        RejectedAmount: 0,
                        ReimbursedAmount: 0,
                    },
                },
            });
            return;
        }

        const totalAmount = expensesResult.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0);
        const pendingAmount = expensesResult.filter((e: any) => e.status === 'pending').reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0);
        const approvedAmount = expensesResult.filter((e: any) => e.status === 'approved').reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0);
        const rejectedAmount = expensesResult.filter((e: any) => e.status === 'rejected').reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0);
        const reimbursedAmount = expensesResult.filter((e: any) => e.status === 'reimbursed').reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0);

        const formattedExpenses = expensesResult.map((expense: any) => ({
            ExpenseId: expense.id,
            ExpenseTitle: expense.expenses_title,
            BugetToken: expense.buget_token,
            ExpenseToken: expense.expense_token,
            ProjectToken: expense.projecttoken,
            Category: expense.category,
            UserPublicToken: userPublicToken,
            CreatedByName: expense.created_by_name,
            Amount: parseFloat(expense.amount),
            ExpenseDate: expense.expense_date,
            Description: expense.description,
            ReceiptUrl: expense.receipt_url,
            Status: expense.status,
            ApprovalDate: expense.approval_date,
            ApprovedBy: expense.approved_by,
            ApprovedByName: expense.approved_by_name,
            RejectionReason: expense.rejection_reason,
            ReimbursementDate: expense.reimbursement_date,
            CreatedAt: expense.created_at,
            UpdatedAt: expense.updated_at,
        }));

        res.status(200).json({
            error: false,
            message: 'Expenses retrieved successfully',
            data: {
                ProjectToken,
                expenses: formattedExpenses,
                totalExpenses: expensesResult.length,
                summary: {
                    TotalAmount: totalAmount,
                    PendingAmount: pendingAmount,
                    ApprovedAmount: approvedAmount,
                    RejectedAmount: rejectedAmount,
                    ReimbursedAmount: reimbursedAmount,
                },
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }

        logging.error('GET_PROJECT_EXPENSES', error.message);

        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const AddNewExpense = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('ADD_NEW_EXPENSE', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('ADD_NEW_EXPENSE', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { BugetToken, ExpenseTitle, ProjectToken, UserSessionToken, Category, Amount, ExpenseDate, Description, ReceiptUrl } = req.body;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('ADD_NEW_EXPENSE', 'Invalid user session token');
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
            logging.error('ADD_NEW_EXPENSE', `Project not found: ${ProjectToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Project not found',
            });
            return;
        }

        const expenseToken = utilFunctions.CreateToken();

        const insertQuery = `
            INSERT INTO project_expenses 
                (expenses_title, buget_token, ProjectToken, expense_token, category, user_private_token, amount, expense_date, description, receipt_url)
            VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        const params = [ExpenseTitle, BugetToken, ProjectToken, expenseToken, Category, userPrivateToken, Amount, ExpenseDate || new Date().toISOString().split('T')[0], Description, ReceiptUrl || null];

        const result = await query(connection, insertQuery, params);
        connection.release();

        if (!result || result.length === 0) {
            logging.error('ADD_NEW_EXPENSE', 'Failed to create expense');
            res.status(200).json({
                error: true,
                errmsg: 'Failed to create expense',
            });
            return;
        }

        const expense = result[0];

        res.status(200).json({
            error: false,
            message: 'Expense created successfully',
            data: {
                ExpenseId: expense.id,
                ExpenseTitle: expense.expenses_title,
                BugetToken: expense.buget_token,
                ExpenseToken: expense.expense_token,
                ProjectToken: expense.projecttoken,
                Category: expense.category,
                UserPublicToken: userPublicToken,
                Amount: parseFloat(expense.amount),
                ExpenseDate: expense.expense_date,
                Description: expense.description,
                ReceiptUrl: expense.receipt_url,
                Status: expense.status,
                CreatedAt: expense.created_at,
                UpdatedAt: expense.updated_at,
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }

        logging.error('ADD_NEW_EXPENSE', error.message);

        let errorMessage = error.message;

        if (error.code === '23503') {
            errorMessage = 'Project does not exist';
        } else if (error.code === '23514') {
            errorMessage = 'Amount must be a positive number';
        }

        res.status(200).json({
            error: true,
            errmsg: errorMessage,
        });
    }
};

const UpdateExpense = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('UPDATE_EXPENSE', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('UPDATE_EXPENSE', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { ExpenseToken, UserSessionToken, Category, Amount, ExpenseDate, Description } = req.body;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('UPDATE_EXPENSE', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const existingExpense = await checkExpenseExists(connection, ExpenseToken);
        if (!existingExpense) {
            connection.release();
            logging.error('UPDATE_EXPENSE', `Expense not found: ${ExpenseToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Expense not found',
            });
            return;
        }

        if (existingExpense.status === 'approved' || existingExpense.status === 'reimbursed') {
            connection.release();
            logging.error('UPDATE_EXPENSE', 'Cannot update approved or reimbursed expense');
            res.status(200).json({
                error: true,
                errmsg: 'Cannot update approved or reimbursed expense',
            });
            return;
        }

        // Build dynamic update query
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramCounter = 1;

        if (Category !== undefined) {
            updateFields.push(`category = $${paramCounter++}`);
            updateValues.push(Category);
        }

        if (Amount !== undefined) {
            updateFields.push(`amount = $${paramCounter++}`);
            updateValues.push(Amount);
        }

        if (ExpenseDate !== undefined) {
            updateFields.push(`expense_date = $${paramCounter++}`);
            updateValues.push(ExpenseDate);
        }

        if (Description !== undefined) {
            updateFields.push(`description = $${paramCounter++}`);
            updateValues.push(Description);
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        if (updateFields.length === 1) {
            connection.release();
            logging.error('UPDATE_EXPENSE', 'No fields to update');
            res.status(200).json({
                error: true,
                errmsg: 'No fields to update',
            });
            return;
        }

        updateValues.push(ExpenseToken);

        const updateQuery = `
            UPDATE project_expenses 
            SET ${updateFields.join(', ')}
            WHERE expense_token = $${paramCounter}
            RETURNING *
        `;

        const result = await query(connection, updateQuery, updateValues);
        connection.release();

        if (!result || result.length === 0) {
            logging.error('UPDATE_EXPENSE', 'Failed to update expense');
            res.status(200).json({
                error: true,
                errmsg: 'Failed to update expense',
            });
            return;
        }

        const expense = result[0];

        res.status(200).json({
            error: false,
            message: 'Expense updated successfully',
            data: {
                ExpenseId: expense.id,
                ExpenseTitle: expense.expenses_title,
                ExpenseToken: expense.expense_token,
                ProjectToken: expense.projecttoken,
                Category: expense.category,
                UserPrivateToken: expense.user_private_token,
                Amount: parseFloat(expense.amount),
                ExpenseDate: expense.expense_date,
                Description: expense.description,
                ReceiptUrl: expense.receipt_url,
                Status: expense.status,
                CreatedAt: expense.created_at,
                UpdatedAt: expense.updated_at,
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }

        logging.error('UPDATE_EXPENSE', error.message);

        let errorMessage = error.message;

        if (error.code === '23514') {
            errorMessage = 'Amount must be a positive number';
        }

        res.status(200).json({
            error: true,
            errmsg: errorMessage,
        });
    }
};

const RemoveExpense = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('REMOVE_EXPENSE', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('REMOVE_EXPENSE', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { ExpenseToken, UserSessionToken } = req.params;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('REMOVE_EXPENSE', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const userPublicToken = await utilFunctions.getUserPublicTokenFromPrivateToken(connection, userPrivateToken);

        const existingExpense = await checkExpenseExists(connection, ExpenseToken);
        if (!existingExpense) {
            connection.release();
            logging.error('REMOVE_EXPENSE', `Expense not found: ${ExpenseToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Expense not found',
            });
            return;
        }

        if (existingExpense.status === 'approved' || existingExpense.status === 'reimbursed') {
            connection.release();
            logging.error('REMOVE_EXPENSE', 'Cannot delete approved or reimbursed expense');
            res.status(200).json({
                error: true,
                errmsg: 'Cannot delete approved or reimbursed expense',
            });
            return;
        }

        const deleteQuery = `
            DELETE FROM project_expenses
            WHERE expense_token = $1
            RETURNING *
        `;

        const result = await query(connection, deleteQuery, [ExpenseToken]);
        connection.release();

        if (!result || result.length === 0) {
            logging.error('REMOVE_EXPENSE', 'Failed to delete expense');
            res.status(200).json({
                error: true,
                errmsg: 'Failed to delete expense',
            });
            return;
        }

        res.status(200).json({
            error: false,
            message: 'Expense deleted successfully',
            data: {
                ExpenseId: result[0].id,
                ExpenseTitle: result[0].expenses_title,
                ExpenseToken: result[0].expense_token,
                ProjectToken: result[0].projecttoken,
                Category: result[0].category,
                UserPublicToken: userPublicToken,
                Amount: parseFloat(result[0].amount),
                ExpenseDate: result[0].expense_date,
                Description: result[0].description,
                ReceiptUrl: result[0].receipt_url,
                Status: result[0].status,
                CreatedAt: result[0].created_at,
                UpdatedAt: result[0].updated_at,
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }

        logging.error('REMOVE_EXPENSE', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const ApproveExpense = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('APPROVE_EXPENSE', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('APPROVE_EXPENSE', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { ExpenseToken, UserSessionToken, Status, Notes } = req.body;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('APPROVE_EXPENSE', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const userPublicToken = await utilFunctions.getUserPublicTokenFromPrivateToken(connection, userPrivateToken);

        const existingExpense = await checkExpenseExists(connection, ExpenseToken);
        if (!existingExpense) {
            connection.release();
            logging.error('APPROVE_EXPENSE', `Expense not found: ${ExpenseToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Expense not found',
            });
            return;
        }

        if (existingExpense.status !== 'pending') {
            connection.release();
            logging.error('APPROVE_EXPENSE', `Expense is not in pending status: ${ExpenseToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Only pending expenses can be approved or rejected',
            });
            return;
        }

        let updateQuery: string;
        let updateParams: any[];

        if (Status === 'approved') {
            updateQuery = `
                UPDATE project_expenses 
                SET status = $1,
                    approved_by = $2,
                    approval_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE expense_token = $3
                RETURNING *
            `;
            updateParams = [Status, userPrivateToken, ExpenseToken];
        } else {
            // Status is 'rejected'
            updateQuery = `
                UPDATE project_expenses 
                SET status = $1,
                    approved_by = $2,
                    approval_date = CURRENT_TIMESTAMP,
                    rejection_reason = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE expense_token = $4
                RETURNING *
            `;
            updateParams = [Status, userPrivateToken, Notes || null, ExpenseToken];
        }

        const result = await query(connection, updateQuery, updateParams);
        connection.release();

        if (!result || result.length === 0) {
            logging.error('APPROVE_EXPENSE', 'Failed to update expense status');
            res.status(200).json({
                error: true,
                errmsg: 'Failed to update expense status',
            });
            return;
        }

        const expense = result[0];

        res.status(200).json({
            error: false,
            message: `Expense ${Status} successfully`,
            data: {
                ExpenseId: expense.id,
                ExpenseTitle: expense.expenses_title,
                ExpenseToken: expense.expense_token,
                ProjectToken: expense.projecttoken,
                Category: expense.category,
                UserPublicToken: userPublicToken,
                Amount: parseFloat(expense.amount),
                ExpenseDate: expense.expense_date,
                Description: expense.description,
                ReceiptUrl: expense.receipt_url,
                Status: expense.status,
                ApprovalDate: expense.approval_date,
                ApprovedBy: expense.approved_by,
                RejectionReason: expense.rejection_reason,
                CreatedAt: expense.created_at,
                UpdatedAt: expense.updated_at,
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }

        logging.error('APPROVE_EXPENSE', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const UploadReceipt = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('UPLOAD_RECEIPT', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('UPLOAD_RECEIPT', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        if (!req.file) {
            connection.release();
            res.status(200).json({
                error: true,
                errmsg: 'No receipt file uploaded',
            });
            return;
        }

        const { ExpenseToken, UserSessionToken } = req.body;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            fs.unlinkSync(req.file.path);

            logging.error('UPLOAD_RECEIPT', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const userPublicToken = await utilFunctions.getUserPublicTokenFromPrivateToken(connection, userPrivateToken);

        const expenseQuery = `
            SELECT id, receipt_url, ProjectToken
            FROM project_expenses 
            WHERE expense_token = $1
        `;
        const expenseResult = await query(connection, expenseQuery, [ExpenseToken]);

        if (!expenseResult || expenseResult.length === 0) {
            connection.release();
            fs.unlinkSync(req.file.path);

            logging.error('UPLOAD_RECEIPT', `Expense not found or unauthorized: ${ExpenseToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Expense not found or unauthorized',
            });
            return;
        }

        const expense = expenseResult[0];
        const oldReceiptUrl = expense.receipt_url;

        const baseUrl = process.env.FILE_SERVER || 'http://localhost:5600';
        const receiptFileName = req.file.filename;
        const receiptUrl = `${baseUrl}/projects/finances/${receiptFileName}`;

        const updateQuery = `
            UPDATE project_expenses 
            SET 
                receipt_url = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING 
                id,
                expenses_title,
                expense_token,
                ProjectToken,
                buget_token,
                category,
                amount,
                expense_date,
                description,
                receipt_url,
                status,
                created_at,
                updated_at
        `;

        const updateResult = await query(connection, updateQuery, [receiptUrl, expense.id]);
        connection.release();

        if (!updateResult || updateResult.length === 0) {
            // Delete uploaded file if update failed
            fs.unlinkSync(req.file.path);

            logging.error('UPLOAD_RECEIPT', 'Failed to update expense with receipt');
            res.status(200).json({
                error: true,
                errmsg: 'Failed to update expense with receipt',
            });
            return;
        }

        if (oldReceiptUrl) {
            try {
                const oldFileName = oldReceiptUrl.split('/').pop();
                const oldFilePath = path.join(process.env.FINANCES_FILE_PATH!, oldFileName!);

                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            } catch (err: any) {
                logging.error('UPLOAD_RECEIPT', `Failed to delete old receipt: ${err.message}`);
            }
        }

        const updatedExpense = updateResult[0];

        res.status(200).json({
            error: false,
            message: 'Receipt uploaded successfully',
            data: {
                ExpenseId: updatedExpense.id,
                ExpenseTitle: updatedExpense.expenses_title,
                ExpenseToken: updatedExpense.expense_token,
                ProjectToken: updatedExpense.projecttoken,
                BugetToken: updatedExpense.buget_token,
                Category: updatedExpense.category,
                UserPublicToken: userPublicToken,
                Amount: parseFloat(updatedExpense.amount),
                ExpenseDate: updatedExpense.expense_date,
                Description: updatedExpense.description,
                ReceiptUrl: updatedExpense.receipt_url,
                Status: updatedExpense.status,
                CreatedAt: updatedExpense.created_at,
                UpdatedAt: updatedExpense.updated_at,
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }

        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err: any) {
                logging.error('UPLOAD_RECEIPT', `Failed to delete file on error: ${err.message}`);
            }
        }

        logging.error('UPLOAD_RECEIPT', error.message);

        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

export default { AddNewExpense, GetProjectExpenses, UpdateExpense, RemoveExpense, ApproveExpense, UploadReceipt };
