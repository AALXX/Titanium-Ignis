import { Response } from 'express';
import { validationResult } from 'express-validator';
import logging from '../../config/logging';
import { connect, CustomRequest, query } from '../../config/postgresql';
import utilFunctions from '../../util/utilFunctions';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { getResetEmailTemplate, getPasswordResetEmailTemplate } from '../../config/HTML_Email_Templates';

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
        const checkUserSql = `SELECT * FROM users WHERE UserEmail = $1`;
        const userResult = await query(connection!, checkUserSql, [req.body.userEmail]);

        let userId: number;
        let userPrivateToken: string;
        let userPublicToken: string;

        if (userResult.length > 0) {
            const existingUser = userResult[0];
            userId = existingUser.id;
            userPrivateToken = existingUser.userprivatetoken;
            userPublicToken = existingUser.userpublictoken;
        } else {
            userPrivateToken = utilFunctions.CreateToken();
            userPublicToken = utilFunctions.CreatePublicToken(req.body.userName);
            const randomPwd = await utilFunctions.HashPassword(utilFunctions.generateSecurePassword());

            const insertUserSql = `
                INSERT INTO users (UserName, UserEmail, UserPwd, UserPrivateToken, UserSessionToken, UserPublicToken, RegistrationType)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `;
            const userInsertRes = await query(connection!, insertUserSql, [req.body.userName, req.body.userEmail, randomPwd, userPrivateToken, req.body.userSessionToken, userPublicToken, req.body.registrationType]);
            userId = userInsertRes[0].id;
        }

        // Create session entry
        const insertSessionSql = `
            INSERT INTO account_sessions (userID, userSessionToken, RegistrationType)
            VALUES ($1, $2, $3)
        `;
        await query(connection!, insertSessionSql, [userId, req.body.userSessionToken, req.body.registrationType]);

        connection?.release();
        res.status(200).json({
            error: false,
            userPrivateToken,
            userPublicToken,
        });
    } catch (error: any) {
        logging.error('REGISTER_USER_WITH_GOOGLE', error.message);
        connection?.release();
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
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
        errors.array().forEach((error) => {
            logging.error('REGISTER_USER_FUNCTION', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    const connection = await connect(req.pool!);

    try {
        const UserPrivateToken = utilFunctions.CreateToken();
        const UserPublicToken = utilFunctions.CreatePublicToken(req.body.userName);
        const HashedPassword = await utilFunctions.HashPassword(req.body.password);
        const AccessToken = utilFunctions.CreateToken(); // session token

        const insertUserSQL = `
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
            RETURNING id
        `;

        const userInsertResult = await query(connection!, insertUserSQL, [req.body.userName, req.body.userEmail, HashedPassword, UserPrivateToken, AccessToken, UserPublicToken, 'credentials']);

        const userId = userInsertResult[0].id;

        const insertSessionSQL = `
            INSERT INTO account_sessions (
                userID,
                userSessionToken,
                RegistrationType
            )
            VALUES ($1, $2, $3)
        `;

        await query(connection!, insertSessionSQL, [userId, AccessToken, 'credentials']);

        connection?.release();

        res.status(200).json({
            error: false,
            userSessionToken: AccessToken,
            userPrivateToken: UserPrivateToken,
            userPublicToken: UserPublicToken,
        });
    } catch (error: any) {
        logging.error('REGISTER_USER_FUNCTION', error.message);
        connection?.release();
        res.status(200).json({
            error: true,
            errmsg: 'Something went wrong',
        });
    }
};

const LoginUser = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach((error) => {
            logging.error('LOGIN_USER_FUNCTION', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    const connection = await connect(req.pool!);

    try {
        const getAccountInfo = `
            SELECT id, userpwd, username, userprivatetoken, userpublictoken
            FROM users
            WHERE UserEmail = $1
        `;
        const accountInfo = await query(connection!, getAccountInfo, [req.body.userEmail]);

        if (accountInfo.length === 0) {
            res.status(200).json({ error: true, errmsg: 'Account not found' });
            connection?.release();
            return;
        }

        const user = accountInfo[0];

        // 2. Check password
        const isPasswordValid = bcrypt.compareSync(req.body.password, user.userpwd);
        if (!isPasswordValid) {
            res.status(200).json({ error: true, errmsg: 'Wrong password' });
            connection?.release();
            return;
        }

        const userSessionToken = utilFunctions.CreateToken();

        const insertSession = `
            INSERT INTO account_sessions (
                userID,
                userSessionToken,
                RegistrationType
            )
            VALUES ($1, $2, $3)
        `;
        await query(connection!, insertSession, [user.id, userSessionToken, 'credentials']);

        connection?.release();

        res.status(200).json({
            error: false,
            userSessionToken: userSessionToken,
            userName: user.username,
            userPrivateToken: user.userprivatetoken,
            userPublicToken: user.userpublictoken,
        });
    } catch (error: any) {
        logging.error('LOGIN_USER_FUNCTION', error.message);
        connection?.release();
        res.status(200).json({
            error: true,
            errmsg: 'Something went wrong',
        });
    }
};

const LogoutUser = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach((error) => {
            logging.error('LOGOUT_USER_FUNCTION', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }
    try {
        const connection = await connect(req.pool!);

        const queryString = `
            DELETE FROM account_sessions
            WHERE userSessionToken = $1
        `;
        await query(connection!, queryString, [req.body.userSessionToken]);

        connection?.release();

        res.status(200).json({ error: false });
    } catch (error: any) {
        logging.error('LOGOUT_USER_FUNCTION', error.message);
        res.status(200).json({
            error: true,
            errmsg: 'Something went wrong',
        });
    }
};

const GetUserAccountData = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach((error) => {
            logging.error('GET_USER_ACCOUNT_DATA', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    const sessionToken = req.params.accountSessionToken;

    if (!sessionToken || sessionToken === 'undefined') {
        res.status(200).json({
            error: true,
            errmsg: 'Invalid session token',
        });
        return;
    }

    try {
        const connection = await connect(req.pool!);

        const queryString = `
            SELECT u.UserName, u.RegistrationType, u.UserEmail
            FROM account_sessions s
            INNER JOIN users u ON s.userID = u.id
            WHERE s.userSessionToken = $1
            LIMIT 1;
        `;

        const result = await query(connection!, queryString, [sessionToken]);

        connection?.release();

        if (result.length === 0) {
            res.status(200).json({
                error: true,
                errmsg: 'User not found or session expired',
            });
            return;
        }

        res.status(200).json({
            error: false,
            username: result[0].username,
            userEmail: result[0].useremail,
            accountType: result[0].registrationtype,
        });
    } catch (error: any) {
        logging.error('GET_USER_ACCOUNT_DATA', error.message);
        res.status(200).json({
            error: true,
            errmsg: 'Something went wrong while retrieving account data',
        });
    }
};

const GetAllUserProjects = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach((error) => {
            logging.error('GET_USER_ACCOUNT_DATA', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);

        const sessionQuery = `
            SELECT u.UserPrivateToken 
            FROM account_sessions s
            INNER JOIN users u ON s.userID = u.id
            WHERE s.userSessionToken = $1
            LIMIT 1;
        `;
        const sessionResult = await query(connection!, sessionQuery, [req.params.accountSessionToken]);

        if (sessionResult.length === 0) {
            connection?.release();
            res.status(200).json({
                error: true,
                errmsg: 'Session not found or expired',
            });
            return;
        }

        const userPrivateToken = sessionResult[0].userprivatetoken;

        const projectQuery = `
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

        const projectsResult = await query(connection!, projectQuery, [userPrivateToken]);
        connection?.release();

        const projects = projectsResult.map((row: any) => ({
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
            projects,
        });
    } catch (error: any) {
        logging.error('GET_USER_ACCOUNT_DATA', error.message);
        res.status(200).json({
            error: true,
            errmsg: 'Something went wrong while fetching user projects',
        });
    }
};

const ChangeUserData = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('CHANGE_USER_DATA', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);

        const sessionQuery = `
            SELECT u.UserPrivateToken 
            FROM account_sessions s
            INNER JOIN users u ON s.userID = u.id
            WHERE s.userSessionToken = $1
            LIMIT 1;
        `;
        const sessionResult = await query(connection!, sessionQuery, [req.body.userSessionToken]);

        if (sessionResult.length === 0) {
            connection?.release();
            res.status(200).json({
                error: true,
                errmsg: 'Session not found or expired',
            });
            return;
        }

        const userPrivateToken = sessionResult[0].userprivatetoken;

        const queryString = `UPDATE users SET UserName = $1 WHERE UserPrivateToken = $2`;
        await query(connection!, queryString, [req.body.userName, userPrivateToken]);
        connection?.release();

        res.status(200).json({
            error: false,
            errmsg: 'User data updated successfully',
        });
    } catch (error: any) {
        logging.error('CHANGE_USER_DATA', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const GetChangeEmailLink = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_CHANGE_EMAIL_LINK', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);

        const sessionQuery = `
            SELECT u.UserPrivateToken, u.UserEmail
            FROM account_sessions s
            INNER JOIN users u ON s.userID = u.id
            WHERE s.userSessionToken = $1
            LIMIT 1;
        `;
        const sessionResult = await query(connection!, sessionQuery, [req.body.userSessionToken]);

        if (sessionResult.length === 0) {
            connection?.release();
            res.status(200).json({
                error: true,
                errmsg: 'Session not found or expired',
            });
            return;
        }

        const userPrivateToken = sessionResult[0].userprivatetoken;
        const userEmail = sessionResult[0].useremail;

        const token = jwt.sign(
            {
                userPrivateToken: userPrivateToken,
                type: 'CHANGE_EMAIL',
            },
            process.env.CHANGE_GMAIL_SECRET as string,
            { expiresIn: '1h' },
        );

        const changeEmailLink = `${process.env.FRONTEND_URL}/account/change-email/${token}`;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"Titanium Ignis" <${process.env.EMAIL_USERNAME}>`,
            to: userEmail,
            subject: 'Change Email Request',
            html: getResetEmailTemplate(userEmail, changeEmailLink),
        };

        await transporter.sendMail(mailOptions);
        connection?.release();

        res.status(200).json({
            error: false,
            errmsg: 'Email change link sent successfully',
        });
    } catch (error: any) {
        logging.error('GET_CHANGE_EMAIL_LINK', error);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const ChangeUserEmail = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('CHANGE_USER_EMAIL', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);

        let tokenPayload: { userPrivateToken: string; type: string; iat: number; exp: number } | null = null;

        try {
            tokenPayload = jwt.verify(req.body.token, process.env.CHANGE_GMAIL_SECRET as string) as { userPrivateToken: string; type: string; iat: number; exp: number };

            if (tokenPayload.type !== 'CHANGE_EMAIL') {
                res.status(200).json({
                    error: true,
                    errmsg: 'This link is not valid for changing email addresses.',
                });
                return;
            }
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                res.status(200).json({ error: true, errmsg: 'Token expired' });
            } else {
                res.status(200).json({ error: true, errmsg: 'Token is invalid' });
            }
            return;
        }

        const updateQuery = `UPDATE users SET UserEmail = $1 WHERE UserPrivateToken = $2`;
        await query(connection!, updateQuery, [req.body.newEmail, tokenPayload.userPrivateToken]);
        connection?.release();

        res.status(200).json({
            error: false,
            errmsg: 'User email updated successfully',
        });
    } catch (error: any) {
        logging.error('CHANGE_USER_EMAIL', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

const GetChangePasswordLink = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('GET_CHANGE_EMAIL_LINK', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);

        const sessionQuery = `
            SELECT u.UserPrivateToken, u.UserEmail
            FROM account_sessions s
            INNER JOIN users u ON s.userID = u.id
            WHERE s.userSessionToken = $1
            LIMIT 1;
        `;
        const sessionResult = await query(connection!, sessionQuery, [req.body.userSessionToken]);

        if (sessionResult.length === 0) {
            connection?.release();
            res.status(200).json({
                error: true,
                errmsg: 'Session not found or expired',
            });
            return;
        }

        const userPrivateToken = sessionResult[0].userprivatetoken;
        const userEmail = sessionResult[0].useremail;

        const token = jwt.sign(
            {
                userPrivateToken: userPrivateToken,
                type: 'CHANGE_PASSWORD',
            },
            process.env.CHANGE_PWD_SECRET as string,
            { expiresIn: '1h' },
        );

        const changeEmailLink = `${process.env.FRONTEND_URL}/account/change-password/${token}`;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"Titanium Ignis" <${process.env.EMAIL_USERNAME}>`,
            to: userEmail,
            subject: 'Change Password Request',
            html: getPasswordResetEmailTemplate(userEmail, changeEmailLink),
        };

        await transporter.sendMail(mailOptions);
        connection?.release();

        res.status(200).json({
            error: false,
            errmsg: 'Email change link sent successfully',
        });
    } catch (error: any) {
        logging.error('GET_CHANGE_EMAIL_LINK', error);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};


const ChangeUserPassword = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('CHANGE_USER_PASSWORD', error.errorMsg);
        });
        res.status(200).json({ error: true, errors: errors.array() });
        return;
    }

    try {
        const connection = await connect(req.pool!);

        let tokenPayload: { userPrivateToken: string; type: string; iat: number; exp: number } | null = null;

        try {
            tokenPayload = jwt.verify(req.body.token, process.env.CHANGE_PWD_SECRET as string) as { userPrivateToken: string; type: string; iat: number; exp: number };

            if (tokenPayload.type !== 'CHANGE_PASSWORD') {
                res.status(200).json({
                    error: true,
                    errmsg: 'This link is not valid for changing email addresses.',
                });
                return;
            }
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                res.status(200).json({ error: true, errmsg: 'Token expired' });
            } else {
                res.status(200).json({ error: true, errmsg: 'Token is invalid' });
            }
            return;
        }
        const HashedPassword = await utilFunctions.HashPassword(req.body.newPassword);


        const updateQuery = `UPDATE users SET UserPwd = $1 WHERE UserPrivateToken = $2`;
        await query(connection!, updateQuery, [HashedPassword, tokenPayload.userPrivateToken]);
        connection?.release();

        res.status(200).json({
            error: false,
            errmsg: 'User email updated successfully',
        });
    } catch (error: any) {
        logging.error('CHANGE_USER_PASSWORD', error.message);
        res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
    
}
export default {
    RegisterUserWithGoogle,
    RegisterUser,
    LoginUser,
    LogoutUser,
    GetUserAccountData,
    GetAllUserProjects,
    SearchUser,
    ChangeUserData,
    GetChangeEmailLink,
    ChangeUserEmail,
    GetChangePasswordLink,
    ChangeUserPassword,
};
