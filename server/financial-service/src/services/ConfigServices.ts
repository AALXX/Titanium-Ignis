import { Response } from 'express';
import { validationResult } from 'express-validator';
import logging from '../config/logging';
import { connect, CustomRequest, query } from '../config/postgresql';
import utilFunctions from '../util/utilFunctions';
import { PoolClient } from 'pg';
import config from '../../../main-backend/src/config/config';

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

const GetProjectConfig = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_PROJECT_MONED', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    let connection: PoolClient | null = null;
    try {
        connection = await connect(req.pool!);

        if (!connection) {
            logging.error('GET_PROJECT_CONFIG', 'Failed to establish database connection');
            res.status(200).json({
                error: true,
                errmsg: 'Database connection failed',
            });
            return;
        }

        const { ProjectToken, UserSessionToken } = req.params;

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection, UserSessionToken);

        if (!userPrivateToken) {
            connection.release();
            logging.error('GET_PROJECT_CONFIG', 'Invalid user session token');
            res.status(200).json({
                error: true,
                errmsg: 'Invalid user session token',
            });
            return;
        }

        const getBugetsQuery = `
            SELECT * FROM financial_module_config WHERE project_token = $1;
        `;

        const configResult = await query(connection, getBugetsQuery, [ProjectToken]);
        connection.release();

        if (!configResult || configResult.length === 0) {
            logging.info('GET_PROJECT_CONFIG', `No config found for project: ${ProjectToken}`);
            res.status(200).json({
                error: false,
                message: 'no config found',
                data: {
                    curency: '',
                    fiscalYearStart: '',
                },
            });
            return;
        }

        res.status(200).json({
            error: false,
            message: 'Config found',
            data: {
                currency: configResult[0].currency,
                fiscalYearStart: configResult[0].fiscal_year_start,
            },
        });
    } catch (error: any) {
        if (connection) {
            connection.release();
        }

        logging.error('GET_PROJECT_CONFIG', error.message);

        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

export default {
    GetProjectConfig,
};
