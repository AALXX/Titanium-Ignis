import { Response } from 'express';
import { validationResult } from 'express-validator';
import logging from '../../config/logging';
import { connect, CustomRequest, query } from '../../config/postgresql';
import utilFunctions from '../../util/utilFunctions';

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

const RegisterUser = async (req: CustomRequest, res: Response): Promise<void> => {
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

            switch (req.body.registrationType) {
                case 'google':
                    // Update Google session token
                    updateQuery = `
                        UPDATE users 
                        SET UserSessionToken = $1, 
                            UserPublicToken = $2
                        WHERE UserEmail = $3 
                        RETURNING UserPrivateToken, UserPublicToken
                    `;
                    updateParams = [req.body.userSessionToken, newUserPublicToken, req.body.userEmail];
                    break;

                case 'credentials':
                    // Verify password before updating session
                    // const isPasswordValid = await utilFunctions.ComparePassword(req.body.password, existingUser.userpwd);

                    // if (!isPasswordValid) {
                    //     connection?.release();
                    //     return res.status(200).json({
                    //         error: true,
                    //         errmsg: 'Invalid credentials',
                    //     });
                    // }

                    updateQuery = `
                        UPDATE users 
                        SET UserPublicToken = $1
                        WHERE UserEmail = $2 
                        RETURNING UserPrivateToken, UserPublicToken
                    `;
                    updateParams = [newUserPublicToken, req.body.userEmail];
                    break;

                default:
                    connection?.release();
                    res.status(200).json({
                        error: true,
                        errmsg: 'Invalid registration type',
                    });
                    return;
            }

            const updatedUser = await query(connection!, updateQuery, updateParams);

            connection?.release();
            res.status(200).json({
                error: false,
                userPrivateToken: updatedUser[0].userprivatetoken,
                userPublicToken: updatedUser[0].userpublictoken,
            });
            return;
        }

        // New user registration
        const UserPrivateToken = utilFunctions.CreateToken();
        const UserPublicToken = utilFunctions.CreatePublicToken(req.body.userName);

        switch (req.body.registrationType) {
            case 'google':
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
                break;

            case 'credentials':
                const hashedpwd = await utilFunctions.HashPassword(req.body.password);

                const QueryString = `
                    INSERT INTO users (
                        UserName, 
                        UserEmail, 
                        UserPwd, 
                        UserPrivateToken,
                        UserPublicToken,
                        RegistrationType
                    ) 
                    VALUES ($1, $2, $3, $4, $5, $6)
                `;

                await query(connection!, QueryString, [req.body.userName, req.body.userEmail, hashedpwd, UserPrivateToken, UserPublicToken, req.body.registrationType]);
                break;
            default:
                connection?.release();
                res.status(200).json({
                    error: true,
                    errmsg: 'Invalid registration type',
                });
                return;
        }

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

const GetUserAccountRole = async (req: CustomRequest, res: Response) => {};
export default { RegisterUser, GetUserAccountRole };
