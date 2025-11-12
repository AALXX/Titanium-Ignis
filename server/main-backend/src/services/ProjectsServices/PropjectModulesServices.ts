import { Response } from 'express';
import { validationResult } from 'express-validator';
import logging from '../../config/logging';
import { connect, CustomRequest, query } from '../../config/postgresql';
import utilFunctions from '../../util/utilFunctions';
import { IProjectsDb } from '../../Models/ProjectsModels';

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

const getIsModuleInitialized = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach((error) => {
            logging.error('GET_IS_MODULE_INITIALIZED', error.errorMsg);
        });

        res.status(400).json({ error: true, errors: errors.array() });
        return;
    }

    const connection = await connect(req.pool!);

    try {
        const { projectToken = '', moduleName = '', userSessionToken = '' } = req.params || {};

        if (!projectToken || !moduleName || !userSessionToken) {
            res.status(400).json({ error: true, errmsg: 'Missing required fields' });
            connection?.release();
            return;
        }

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, userSessionToken);

        if (!userPrivateToken) {
            res.status(400).json({ error: true, errmsg: 'User not found' });
            connection?.release();
            return;
        }

        const isModuleInitializedQuery = `
SELECT 
    pam.ModuleName,
    pml.ProjectToken,
    pml.is_module_initialized
FROM project_module_links pml
JOIN project_avalible_modules pam 
  ON pml.ModuleID = pam.id
WHERE pam.ModuleName = $1
  AND pml.ProjectToken = $2;


`;
        const resp = await query(connection!, isModuleInitializedQuery, [moduleName, projectToken]);


        connection?.release();

        res.status(200).json({
            error: false,
            is_module_initialized: resp[0].is_module_initialized,
        });
    } catch (error: any) {
        logging.error('GET_IS_MODULE_INITIALIZED', error.message);
        connection?.release();
        res.status(500).json({
            error: true,
            errmsg: error.message,
        });
    }
};
const initializeModule = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach((error) => {
            logging.error('INITIALIZE_MODULE', error.errorMsg);
        });

        res.status(400).json({ error: true, errors: errors.array() });
        return;
    }

    const connection = await connect(req.pool!);

    try {
        const { projectToken = '', moduleName = '', userSessionToken = '', moduleData = {} } = req.body || {};

        if (!projectToken || !moduleName || !userSessionToken || !moduleData) {
            res.status(400).json({ error: true, errmsg: 'Missing required fields' });
            connection?.release();
            return;
        }

        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, userSessionToken);

        if (!userPrivateToken) {
            res.status(400).json({ error: true, errmsg: 'User not found' });
            connection?.release();
            return;
        }

        // Get the ModuleID from the module name
        const moduleQuery = `
            SELECT id FROM project_avalible_modules 
            WHERE moduleName = $1
        `;

        
        const moduleResult = await query(connection!, moduleQuery, [moduleName]);

        console.log(moduleResult);

        if (moduleResult.length === 0) {
            res.status(400).json({ error: true, errmsg: 'Module not found' });
            connection?.release();
            return;
        }

        const moduleId = moduleResult[0].id;
        switch (moduleName) {
            case 'financial':
                const { currency, fiscalYearStart } = moduleData;

                if (!currency || !fiscalYearStart) {
                    res.status(400).json({ error: true, errmsg: 'Missing finance module configuration' });
                    connection?.release();
                    return;
                }

                const currentYear = new Date().getFullYear();
                const fiscalYearDate = `${currentYear}-${fiscalYearStart.padStart(2, '0')}-01`;

                const checkQuery = `
                SELECT id FROM financial_module_config 
                WHERE project_token = $1
            `;
                const checkResult = await query(connection!, checkQuery, [projectToken]);
                console.log(checkResult);
                if (checkResult.length > 0) {
                    const updateQuery = `
                    UPDATE financial_module_config 
                    SET currency = $1, fiscal_year_start = $2
                    WHERE project_token = $3
                    RETURNING *
                `;
                    await query(connection!, updateQuery, [currency, fiscalYearDate, projectToken]);
                } else {
                    const insertQuery = `
                    INSERT INTO financial_module_config (project_token, currency, fiscal_year_start)
                    VALUES ($1, $2, $3)
                    RETURNING *
                `;
                    await query(connection!, insertQuery, [projectToken, currency, fiscalYearDate]);
                }
        }

        const updateModuleLinkQuery = `
            UPDATE project_module_links 
            SET is_module_initialized = TRUE
            WHERE ProjectToken = $1 AND ModuleID = $2
            RETURNING *
        `;
        const updateResult = await query(connection!, updateModuleLinkQuery, [projectToken, moduleId]);

        if (updateResult.length === 0) {
            res.status(400).json({ error: true, errmsg: 'Project module link not found' });
            connection?.release();
            return;
        }

        connection?.release();
        res.status(200).json({
            error: false,
            success: true,
            message: `${moduleName} module initialized successfully`,
        });
    } catch (error: any) {
        logging.error('INITIALIZE_MODULE', error.message);
        connection?.release();
        res.status(500).json({
            error: true,
            errmsg: error.message,
        });
    }
};

export default { getIsModuleInitialized, initializeModule };
