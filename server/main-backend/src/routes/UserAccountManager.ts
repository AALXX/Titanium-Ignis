import express from 'express';
import { body, param } from 'express-validator';

import AccountServices from '../services/UserAccountServices/UserAccountServices';

const router = express.Router();

//* Owner Account data
router.post(
    '/register-account-google',
    body('userName').not().isEmpty(),
    body('userEmail').isEmail().not().isEmpty(),
    // body('password').isLength({ min: 4 }).not().isEmpty().trim(),
    body('registrationType').not().isEmpty(),
    body('userSessionToken').not().isEmpty(),
    AccountServices.RegisterUserWithGoogle,
);

router.post(
    '/register-account',
    body('userName').not().isEmpty(),
    body('userEmail').isEmail().not().isEmpty(),
    body('password').isLength({ min: 4 }).not().isEmpty().trim(),
    AccountServices.RegisterUser,
);

router.get('/search-users/:searchQuery', param('searchQuery').not().isEmpty(), AccountServices.SearchUser);

router.post('/login-account', body('userEmail').isEmail().not().isEmpty(), body('password').isLength({ min: 6 }).not().isEmpty().trim(), AccountServices.LoginUser);

router.get('/get-account-data/:accountSessionToken', param('accountSessionToken').not().isEmpty(), AccountServices.GetUserAccountData);

router.get('/get-all-user-projects/:accountSessionToken', param('accountSessionToken').not().isEmpty(), AccountServices.GetAllUserProjects);

// router.post(
//     '/change-user-data',
//     body('userName').not().isEmpty(),
//     body('userEmail').not().isEmpty(),
//     body('userDescription'),
//     body('sport').not().isEmpty(),
//     body('price'),
//     body('accountType').not().isEmpty(),
//     body('userVisibility').not().isEmpty(),
//     body('userPrivateToken').not().isEmpty(),
//     OwnerAccountServices.ChangeUserData,
// );

// router.post('/delete-user-account', body('userToken').not().isEmpty(), OwnerAccountServices.DeleteUserAccount);

// router.post('/change-user-icon', OwnerAccountServices.ChangeUserIcon);

export = router;
