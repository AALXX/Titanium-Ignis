import { Response } from 'express';
import { validationResult } from 'express-validator';
import logging from '../config/logging';
import { connect, CustomRequest, query } from '../config/postgresql';
import utilFunctions from '../util/utilFunctions';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';


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


const GetProjectBudget = async (req: CustomRequest, res: Response) => {
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
};
export default {
    GetProjectBudget,
};
