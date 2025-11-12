import { Response } from 'express';
import { validationResult } from 'express-validator';
import logging from '../config/logging';
import { connect, CustomRequest, query } from '../config/postgresql';
import utilFunctions from '../util/utilFunctions';
import { PoolClient } from 'pg';

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

/**
 * Log budget revision to audit table
 */
const logBudgetRevision = async (
    connection: PoolClient,
    bugetToken: string,
    projectToken: string,
    previousAmount: number,
    newAmount: number,
    changeReason: string,
    approvedBy: string,
    fiscalPeriod?: string,
): Promise<void> => {
    const revisionToken = utilFunctions.CreateToken();
    const revisionType = newAmount > previousAmount ? 'increase' : 'decrease';

    const insertRevisionQuery = `
        INSERT INTO budget_revisions 
            (revision_token, buget_token, project_token, previous_amount, new_amount, 
             change_reason, revision_type, approved_by, fiscal_period, revision_date)
        VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    `;

    await query(connection, insertRevisionQuery, [revisionToken, bugetToken, projectToken, previousAmount, newAmount, changeReason, revisionType, approvedBy, fiscalPeriod || null]);
};

/**
 * Log financial event for budget changes
 */
const logFinancialEvent = async (
    connection: PoolClient,
    eventType: string,
    projectToken: string,
    relatedEntityType: string,
    relatedEntityToken: string,
    amount: number,
    transactionDate: string,
    description: string,
    createdBy: string,
    metadata?: any,
): Promise<void> => {
    const eventToken = utilFunctions.CreateToken();

    const insertEventQuery = `
        INSERT INTO financial_events 
            (event_token, event_type, project_token, related_entity_type, related_entity_token,
             amount, currency, transaction_date, description, metadata, created_by, created_at)
        VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
    `;

    await query(connection, insertEventQuery, [
        eventToken,
        eventType,
        projectToken,
        relatedEntityType,
        relatedEntityToken,
        amount,
        'EUR', 
        transactionDate,
        description,
        metadata ? JSON.stringify(metadata) : null,
        createdBy,
    ]);
};

const GetProjectBugets = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECT_BUGETS', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('GET_PROJECT_BUGETS', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { ProjectToken, UserSessionToken } = req.params;

        const assignerPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);

        if (!assignerPrivateToken) {
            connection.release();
            logging.error('GET_PROJECT_BUGETS', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const projectExists = await utilFunctions.checkProjectExists(connection, ProjectToken);
        if (!projectExists) {
            connection.release();
            logging.error('GET_PROJECT_BUGETS', `Project not found: ${ProjectToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Project not found',
            });
            return;
        }

        const getBugetsQuery = `
            SELECT 
                buget_token,
                ProjectToken,
                buget_name,
                total_buget,
                spent_amount,
                currency,
                buget_period,
                notes,
                created_at,
                updated_at,
                (total_buget - spent_amount) as remaining_buget,
                CASE 
                    WHEN total_buget > 0 THEN ROUND((spent_amount / total_buget * 100)::numeric, 2)
                    ELSE 0 
                END as spent_percentage
            FROM projects_bugets 
            WHERE ProjectToken = $1
            ORDER BY created_at DESC
        `;

        const bugetsResult = await query(connection, getBugetsQuery, [ProjectToken]);
        connection.release();

        if (!bugetsResult || bugetsResult.length === 0) {
            logging.info('GET_PROJECT_BUGETS', `No bugets found for project: ${ProjectToken}`);
            res.status(200).json({
                error: false,
                message: 'No bugets found for this project',
                data: {
                    ProjectToken,
                    bugets: [],
                    totalBugets: 0,
                    summary: {
                        TotalBuget: 0,
                        TotalSpent: 0,
                        TotalRemaining: 0,
                        OverallSpentPercentage: 0,
                    },
                },
            });
            return;
        }

        const totalBuget = bugetsResult.reduce((sum: number, b: any) => sum + parseFloat(b.total_buget), 0);
        const totalSpent = bugetsResult.reduce((sum: number, b: any) => sum + parseFloat(b.spent_amount), 0);
        const totalRemaining = totalBuget - totalSpent;
        const overallSpentPercentage = totalBuget > 0 ? Math.round((totalSpent / totalBuget) * 100 * 100) / 100 : 0;

        const formattedBugets = bugetsResult.map((buget: any) => ({
            BugetName: buget.buget_name,
            BugetToken: buget.buget_token,
            ProjectToken: buget.projecttoken,
            TotalBuget: parseFloat(buget.total_buget),
            SpentAmount: parseFloat(buget.spent_amount),
            RemainingBuget: parseFloat(buget.remaining_buget),
            SpentPercentage: parseFloat(buget.spent_percentage),
            Currency: buget.currency,
            BugetPeriod: buget.buget_period,
            Notes: buget.notes,
            CreatedAt: buget.created_at,
            UpdatedAt: buget.updated_at,
        }));

        res.status(200).json({
            error: false,
            message: 'Bugets retrieved successfully',
            data: {
                ProjectToken,
                bugets: formattedBugets,
                totalBugets: bugetsResult.length,
                summary: {
                    TotalBuget: totalBuget,
                    TotalSpent: totalSpent,
                    TotalRemaining: totalRemaining,
                    OverallSpentPercentage: overallSpentPercentage,
                },
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }

        logging.error('GET_PROJECT_BUGETS', error.message);

        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const SetProjectBuget = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('SET_PROJECT_BUGET', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('SET_PROJECT_BUGET', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        await connection.query('BEGIN'); 

        const { ProjectToken, UserSessionToken, BugetName, TotalBuget, SpentAmount, Currency, BugetPeriod, Notes } = req.body;

        const assignerPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!assignerPrivateToken) {
            await connection.query('ROLLBACK');
            connection.release();
            logging.error('SET_PROJECT_BUGET', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const projectExists = await utilFunctions.checkProjectExists(connection, ProjectToken);
        if (!projectExists) {
            await connection.query('ROLLBACK');
            connection.release();
            logging.error('SET_PROJECT_BUGET', `Project not found: ${ProjectToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Project not found',
            });
            return;
        }

        const bugetToken = utilFunctions.CreateToken();

        const insertQuery = `
            INSERT INTO projects_bugets 
                (ProjectToken, buget_name, buget_token, total_buget, spent_amount, currency, buget_period, notes)
            VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const params = [ProjectToken, BugetName, bugetToken, TotalBuget, SpentAmount || 0, Currency || 'EUR', BugetPeriod || null, Notes || null];

        const result = await query(connection, insertQuery, params);

        if (!result || result.length === 0) {
            await connection.query('ROLLBACK');
            connection.release();
            logging.error('SET_PROJECT_BUGET', 'Failed to create project buget');
            res.status(200).json({
                error: true,
                errmsg: 'Failed to create project buget',
            });
            return;
        }

        const buget = result[0];

        await logBudgetRevision(connection, bugetToken, ProjectToken, 0, parseFloat(TotalBuget), `Initial budget created: ${BugetName}`, assignerPrivateToken, BugetPeriod);

        await logFinancialEvent(connection, 'budget_set', ProjectToken, 'budget', bugetToken, parseFloat(TotalBuget), new Date().toISOString().split('T')[0], `Budget created: ${BugetName}`, assignerPrivateToken, {
            budget_name: BugetName,
            budget_period: BugetPeriod,
            currency: Currency || 'EUR',
        });

        await connection.query('COMMIT'); 
        connection.release();

        res.status(200).json({
            error: false,
            message: 'Buget created successfully',
            data: {
                BugetToken: buget.buget_token,
                BugetName: buget.buget_name,
                ProjectToken: buget.projecttoken,
                TotalBuget: parseFloat(buget.total_buget),
                SpentAmount: parseFloat(buget.spent_amount),
                RemainingBuget: parseFloat(buget.total_buget) - parseFloat(buget.spent_amount),
                Currency: buget.currency,
                BugetPeriod: buget.buget_period,
                Notes: buget.notes,
                CreatedAt: buget.created_at,
                UpdatedAt: buget.updated_at,
            },
        });
    } catch (error: any) {
        if (connection) {
            await connection.query('ROLLBACK');
            connection.release();
        }

        logging.error('SET_PROJECT_BUGET', error.message);

        let errorMessage = error.message;

        if (error.code === '23503') {
            errorMessage = 'Project does not exist';
        } else if (error.code === '23514') {
            if (error.constraint === 'chk_spent_not_exceed') {
                errorMessage = 'Spent amount exceeds allowed buget (max 120% of total buget)';
            } else if (error.constraint === 'projects_bugets_total_buget_check') {
                errorMessage = 'Total buget must be a positive number';
            } else if (error.constraint === 'projects_bugets_spent_amount_check') {
                errorMessage = 'Spent amount must be a positive number';
            }
        } else if (error.code === '23505') {
            errorMessage = 'A buget entry with these details already exists for this project';
        }

        res.status(200).json({
            error: true,
            errmsg: errorMessage,
        });
    }
};

const UpdateProjectBuget = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('UPDATE_PROJECT_BUGET', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;

    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('UPDATE_PROJECT_BUGET', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        await connection.query('BEGIN'); 

        const { BugetToken, UserSessionToken, TotalBuget, SpentAmount, Currency, BugetPeriod, Notes, ChangeReason } = req.body;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            await connection.query('ROLLBACK');
            connection.release();
            logging.error('UPDATE_PROJECT_BUGET', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const bugetCheckQuery = `
            SELECT buget_token, buget_name, ProjectToken, total_buget, spent_amount, buget_period
            FROM projects_bugets 
            WHERE buget_token = $1
        `;
        const bugetResult = await query(connection, bugetCheckQuery, [BugetToken]);

        if (!bugetResult || bugetResult.length === 0) {
            await connection.query('ROLLBACK');
            connection.release();
            logging.error('UPDATE_PROJECT_BUGET', `Buget not found: ${BugetToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Buget not found',
            });
            return;
        }

        const existingBuget = bugetResult[0];

        if (TotalBuget !== undefined && SpentAmount !== undefined) {
            if (SpentAmount > TotalBuget * 1.2) {
                await connection.query('ROLLBACK');
                connection.release();
                logging.error('UPDATE_PROJECT_BUGET', 'Spent amount exceeds allowed buget (max 120% of total buget)');
                res.status(200).json({
                    error: true,
                    errmsg: 'Spent amount exceeds allowed buget (max 120% of total buget)',
                });
                return;
            }
        } else if (SpentAmount !== undefined) {
            if (SpentAmount > parseFloat(existingBuget.total_buget) * 1.2) {
                await connection.query('ROLLBACK');
                connection.release();
                logging.error('UPDATE_PROJECT_BUGET', 'Spent amount exceeds allowed buget (max 120% of total buget)');
                res.status(200).json({
                    error: true,
                    errmsg: 'Spent amount exceeds allowed buget (max 120% of total buget)',
                });
                return;
            }
        } else if (TotalBuget !== undefined) {
            if (parseFloat(existingBuget.spent_amount) > TotalBuget * 1.2) {
                await connection.query('ROLLBACK');
                connection.release();
                logging.error('UPDATE_PROJECT_BUGET', 'Cannot reduce buget below current spent amount (max 120% overspend allowed)');
                res.status(200).json({
                    error: true,
                    errmsg: 'Cannot reduce buget below current spent amount (max 120% overspend allowed)',
                });
                return;
            }
        }

        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramCounter = 1;
        let budgetChanged = false;

        if (TotalBuget !== undefined) {
            updateFields.push(`total_buget = $${paramCounter++}`);
            updateValues.push(TotalBuget);
            budgetChanged = true;
        }

        if (SpentAmount !== undefined) {
            updateFields.push(`spent_amount = $${paramCounter++}`);
            updateValues.push(SpentAmount);
        }

        if (Currency !== undefined) {
            updateFields.push(`currency = $${paramCounter++}`);
            updateValues.push(Currency);
        }

        if (BugetPeriod !== undefined) {
            updateFields.push(`buget_period = $${paramCounter++}`);
            updateValues.push(BugetPeriod);
        }

        if (Notes !== undefined) {
            updateFields.push(`notes = $${paramCounter++}`);
            updateValues.push(Notes);
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        if (updateFields.length === 1) {
            await connection.query('ROLLBACK');
            connection.release();
            logging.error('UPDATE_PROJECT_BUGET', 'No fields to update');
            res.status(200).json({
                error: true,
                errmsg: 'No fields to update',
            });
            return;
        }

        updateValues.push(BugetToken);

        const updateQuery = `
            UPDATE projects_bugets 
            SET ${updateFields.join(', ')}
            WHERE buget_token = $${paramCounter}
            RETURNING *
        `;

        const result = await query(connection, updateQuery, updateValues);

        if (!result || result.length === 0) {
            await connection.query('ROLLBACK');
            connection.release();
            logging.error('UPDATE_PROJECT_BUGET', 'Failed to update project buget');
            res.status(200).json({
                error: true,
                errmsg: 'Failed to update project buget',
            });
            return;
        }

        const buget = result[0];

        if (budgetChanged && TotalBuget !== undefined) {
            const reason = ChangeReason || `Budget updated from ${existingBuget.total_buget} to ${TotalBuget}`;
            await logBudgetRevision(connection, BugetToken, existingBuget.projecttoken, parseFloat(existingBuget.total_buget), parseFloat(TotalBuget), reason, userPrivateToken, BugetPeriod || existingBuget.buget_period);

            await logFinancialEvent(
                connection,
                'budget_revised',
                existingBuget.projecttoken,
                'budget',
                BugetToken,
                parseFloat(TotalBuget),
                new Date().toISOString().split('T')[0],
                `Budget revised: ${existingBuget.buget_name}`,
                userPrivateToken,
                {
                    previous_amount: parseFloat(existingBuget.total_buget),
                    new_amount: parseFloat(TotalBuget),
                    change_amount: parseFloat(TotalBuget) - parseFloat(existingBuget.total_buget),
                    reason: reason,
                },
            );
        }

        await connection.query('COMMIT'); 
        connection.release();

        res.status(200).json({
            error: false,
            message: 'Buget updated successfully',
            data: {
                BugetToken: buget.buget_token,
                BugetName: buget.buget_name,
                ProjectToken: buget.projecttoken,
                TotalBuget: parseFloat(buget.total_buget),
                SpentAmount: parseFloat(buget.spent_amount),
                RemainingBuget: parseFloat(buget.total_buget) - parseFloat(buget.spent_amount),
                Currency: buget.currency,
                BugetPeriod: buget.buget_period,
                Notes: buget.notes,
                CreatedAt: buget.created_at,
                UpdatedAt: buget.updated_at,
            },
        });
    } catch (error: any) {
        if (connection) {
            await connection.query('ROLLBACK');
            connection.release();
        }

        logging.error('UPDATE_PROJECT_BUGET', error.message);

        let errorMessage = error.message;

        if (error.code === '23514') {
            if (error.constraint === 'chk_spent_not_exceed') {
                errorMessage = 'Spent amount exceeds allowed buget (max 120% of total buget)';
            } else if (error.constraint === 'projects_bugets_total_buget_check') {
                errorMessage = 'Total buget must be a positive number';
            } else if (error.constraint === 'projects_bugets_spent_amount_check') {
                errorMessage = 'Spent amount must be a positive number';
            }
        }

        res.status(200).json({
            error: true,
            errmsg: errorMessage,
        });
    }
};

const DeleteProjectBuget = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('DELETE_PROJECT_BUGET', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;
    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('DELETE_PROJECT_BUGET', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { BugetToken, ProjectToken, UserSessionToken } = req.params;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);
        if (!userPrivateToken) {
            connection.release();
            logging.error('DELETE_PROJECT_BUGET', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const bugetCheckQuery = `
            SELECT buget_token, ProjectToken, total_buget, spent_amount
            FROM projects_bugets 
            WHERE buget_token = $1
        `;
        const bugetResult = await query(connection, bugetCheckQuery, [BugetToken]);

        if (!bugetResult || bugetResult.length === 0) {
            connection.release();
            logging.error('DELETE_PROJECT_BUGET', `Buget not found: ${BugetToken}`);
            res.status(200).json({
                error: true,
                errmsg: 'Buget not found',
            });
            return;
        }

        const deleteQuery = `
            DELETE FROM projects_bugets
            WHERE buget_token = $1 AND ProjectToken = $2
            RETURNING *
        `;

        const result = await query(connection, deleteQuery, [BugetToken, ProjectToken]);
        connection.release();

        if (!result || result.length === 0) {
            logging.error('DELETE_PROJECT_BUGET', 'Failed to delete project buget');
            res.status(200).json({
                error: true,
                errmsg: 'Failed to delete project buget',
            });
            return;
        }

        const deletedBuget = result[0];

        res.status(200).json({
            error: false,
            message: 'Buget deleted successfully',
            data: {
                BugetToken: deletedBuget.buget_token,
                ProjectToken: deletedBuget.projecttoken,
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }

        logging.error('DELETE_PROJECT_BUGET', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

export default {
    GetProjectBugets,
    SetProjectBuget,
    UpdateProjectBuget,
    DeleteProjectBuget,
};
