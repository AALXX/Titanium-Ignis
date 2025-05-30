import { Response } from 'express';
import { validationResult } from 'express-validator';
import logging from '../../config/logging';
import { connect, CustomRequest, query } from '../../config/postgresql';
import utilFunctions from '../../util/utilFunctions';
import bcrypt from 'bcrypt';

const NAMESPACE = 'PaymentServiceManager';

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

const RegisterUserWithGoogle = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('REGISTER_USER_FUNCTION', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    const connection = await connect(req.pool!);

    try {
        const CheckUserExists = `SELECT * FROM users WHERE UserEmail = $1`;
        const accountresp = await query(connection!, CheckUserExists, [req.body.userEmail]);

        if (accountresp.length > 0) {
            // User exists - update session token based on registration type
            const existingUser = accountresp[0];
            const newUserPublicToken = utilFunctions.CreatePublicToken(req.body.userName);

            let updateQuery = '';
            let updateParams = [];

            updateQuery = `
                        UPDATE users 
                        SET UserSessionToken = $1, 
                            UserPublicToken = $2
                        WHERE UserEmail = $3 
                        RETURNING UserPrivateToken, UserPublicToken
                    `;
            updateParams = [req.body.userSessionToken, newUserPublicToken, req.body.userEmail];

            const updatedUser = await query(connection!, updateQuery, updateParams);

            connection?.release();
            res.status(200).json({
                error: false,
                userPrivateToken: updatedUser[0].userprivatetoken,
                userPublicToken: updatedUser[0].userpublictoken,
            });
            return;
        }

        const UserPrivateToken = utilFunctions.CreateToken();
        const UserPublicToken = utilFunctions.CreatePublicToken(req.body.userName);

        const custompwd = await utilFunctions.HashPassword(utilFunctions.generateSecurePassword());

        const AddAccountQueryString = `
            INSERT INTO users (
                UserName, 
                UserEmail, 
                UserPwd, 
                UserPrivateToken, 
                UserSessionToken, 
                UserPublicToken, 
                RegistrationType
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        await query(connection!, AddAccountQueryString, [req.body.userName, req.body.userEmail, custompwd, UserPrivateToken, req.body.userSessionToken, UserPublicToken, req.body.registrationType]);

        connection?.release();
        res.status(200).json({
            error: false,
            userPrivateToken: UserPrivateToken,
            userPublicToken: UserPublicToken,
        });
        return;
    } catch (error: any) {
        logging.error('CREATE_PROJECT_ENTRY', error.message);
        connection?.release();
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
        return;
    }
};

const SearchUser = async (req: CustomRequest, res: Response): Promise<void> => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('SEARCH_USER', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    const connection = await connect(req.pool!);
    try {
        const queryString = `
        SELECT id, UserName, UserEmail, UserPublicToken
FROM users
WHERE UserEmail ILIKE '%' || $1 || '%'
   OR UserName ILIKE '%' || $1 || '%';;`;

        const userData = await query(connection!, queryString, [req.params.searchQuery]);
        connection?.release();

        res.status(200).json({
            error: false,
            usersData: userData,
        });
        return;
    } catch (error: any) {
        logging.error('SEARCH_USER', error.message);
        connection?.release();
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
        return;
    }
};

const RegisterUser = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('REGISTER_USER_FUNCTION', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);

        const UserPrivateToken = utilFunctions.CreateToken();
        const UserPublicToken = utilFunctions.CreatePublicToken(req.body.userName);

        const custompwd = await utilFunctions.HashPassword(req.body.password);

        const UserSessionToken = utilFunctions.CreateToken();

        const AddAccountQueryString = `
            INSERT INTO users (
                UserName, 
                UserEmail, 
                UserPwd, 
                UserPrivateToken, 
                UserSessionToken, 
                UserPublicToken, 
                RegistrationType
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        await query(connection!, AddAccountQueryString, [req.body.userName, req.body.userEmail, custompwd, UserPrivateToken, UserSessionToken, UserPublicToken, 'platform']);

        connection?.release();
        res.status(200).json({
            error: false,
            userSessionToken: UserSessionToken,
        });
        return;
    } catch (error: any) {
        logging.error('REGISTER_USER_FUNCTION', error.message);
        res.status(200).json({
            error: true,
            errmsg: 'Something went wrong',
        });
        return;
    }
};

const LoginUser = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('LOGIN_USER_FUNCTION', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);

        const getAccountInfo = `SELECT userpwd, UserName FROM users WHERE UserEmail = $1`;
        const accountInfo = await query(connection!, getAccountInfo, [req.body.userEmail]);

        // check if password is correct
        if (bcrypt.compareSync(req.body.password, accountInfo[0].userpwd)) {
            console.log('cum');
            const userSesionToken = utilFunctions.CreateToken();

            const updateSessionToken = `UPDATE users SET UserSessionToken = $1 WHERE UserEmail = $2`;
            await query(connection!, updateSessionToken, [userSesionToken, req.body.userEmail]);

            connection?.release();
            res.status(200).json({
                error: false,
                userSessionToken: userSesionToken,
                userName: accountInfo[0].username,
            });
            return;
        } else {
            res.status(200).json({
                error: true,
                errmsg: 'Wrong password',
            });
            return;
        }
    } catch (error: any) {
        logging.error('LOGIN_USER_FUNCTION', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
        return;
    }
};

const GetUserAccountData = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_USER_ACCOUNT_DATA', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);
        const queryString = `SELECT username, registrationtype FROM users WHERE UserSessionToken = $1`;
        const response = await query(connection!, queryString, [req.params.accountSessionToken]);
        connection?.release();

        if (response.length === 0) {
            res.status(200).json({
                error: false,
                errmsg: 'User not found',
            });
            return;
        }

        res.status(200).json({
            error: false,
            username: response[0].username,
            accountType: response[0].registrationtype,
        });
        return;
    } catch (error: any) {
        logging.error('GET_USER_ACCOUNT_DATA', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
        return;
    }
};

const GetAllUserProjects = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_USER_ACCOUNT_DATA', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);
        const userPrivateToken = await utilFunctions.getUserPrivateTokenFromSessionToken(connection!, req.params.accountSessionToken);

        const queryString = `
SELECT 
    ptm.projecttoken,
    p.projectname,
    p.status,
    r.display_name AS role,
    COUNT(t.id) AS task_count,
    (
        SELECT COUNT(*) 
        FROM projects_team_members ptm_inner 
        WHERE ptm_inner.projecttoken = ptm.projecttoken
    ) AS member_count,
    p.created_at 
FROM projects_team_members ptm
JOIN projects p ON p.projecttoken = ptm.projecttoken
JOIN roles r ON r.id = ptm.role_id
LEFT JOIN projects_task_banners ptb ON ptb.projecttoken = ptm.projecttoken
LEFT JOIN banner_tasks_containers btc ON btc.BannerToken = ptb.BannerToken
LEFT JOIN banner_tasks t ON t.ContainerUUID = btc.ContainerUUID
WHERE ptm.userprivatetoken = $1
GROUP BY 
    ptm.projecttoken,
    p.projectname,
    p.created_at,
    p.status,
    ptm.role_id,
    r.display_name;

`;

        const response = await query(connection!, queryString, [userPrivateToken]);
        connection?.release();

        const projects = response.map((row: any) => ({
            ...row,
            task_count: parseInt(row.task_count, 10),
            member_count: parseInt(row.member_count, 10),
            budget: {
                allocated: 75000,
                spent: 15000,
                currency: 'USD',
            },
            technology: [],
        }));

        res.status(200).json({
            error: false,
            projects: projects,
        });
        return;
    } catch (error: any) {
        logging.error('GET_USER_ACCOUNT_DATA', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
        return;
    }
};

export default { RegisterUserWithGoogle, RegisterUser, LoginUser, GetUserAccountData, GetAllUserProjects, SearchUser };
