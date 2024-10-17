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

const RegisterUser = async (req: CustomRequest, res: Response) => {
    const errors = CustomRequestValidationResult(req);
    if (!errors.isEmpty()) {
        errors.array().map((error) => {
            logging.error('REGISTER_USER_FUNCTION', error.errorMsg);
        });

        return res.status(200).json({ error: true, errors: errors.array() });
    }

    const connection = await connect(req.pool!);

    try {
        const CheckUserExiists = `SELECT * FROM users WHERE  UserEmail = $1`;

        const accountresp = await query(connection!, CheckUserExiists, [req.body.userEmail]);

        if (accountresp.length > 0) {
            return res.status(200).json({
                error: false,
                userPrivateToken: accountresp[0].userprivatetoken,
                userPublicToken: accountresp[0].userpublictoken,
            });
        }

        const UserPrivateToken = utilFunctions.CreateToken();
        const UserPublicToken = utilFunctions.CreateSesionToken();
        switch (req.body.registrationType) {
            case 'google':
                const custompwd = await utilFunctions.HashPassword(utilFunctions.generateSecurePassword());

                const AddAccountQueryString = `INSERT INTO users (UserName, UserEmail, UserPwd, UserPrivateToken, UserPublicToken, RegistrationType) VALUES ($1, $2, $3, $4, $5, $6)`;

                await query(connection!, AddAccountQueryString, [req.body.userName, req.body.userEmail, custompwd, UserPrivateToken, UserPublicToken, req.body.registrationType]);

                break;
            case 'credentials':
                const hashedpwd = await utilFunctions.HashPassword(req.body.password);

                const QueryString = `INSERT INTO users (UserName, UserEmail, UserPwd, UserPrivateToken) VALUES ($1, $2, $3)`;

                // await query(connection!, QueryString, [req.body.projectName, projectToken, req.body.repoUrl, req.body.userToken, req.body.status, req.body.type]);

                break;
        }
        connection?.release();

        return res.status(200).json({
            error: false,
            userPrivateToken: UserPrivateToken,
            userPublicToken: UserPublicToken,
        });
    } catch (error: any) {
        logging.error('CREATE_PROJECT_ENTRY', error.message);
        connection?.release();
        return res.status(200).json({
            error: true,
            errmsg: error.message,
        });
    }
};

export default { RegisterUser };
