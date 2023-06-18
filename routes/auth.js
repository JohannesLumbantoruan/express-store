const { body } = require('express-validator');
const express = require('express');

const User = require('../models/user');

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.post('/login', [
    body('email')
        .notEmpty().withMessage('Please enter your email')
        .normalizeEmail()
        .isEmail().withMessage('Please enter a valid email')
        .custom(async (value, { req }) => {
            const user = await User.findOne({ email: value });
            if (!user) throw new Error();
            req.user = user;
            return true;
        }).withMessage('Account doesn\'t exists'),
    body('password', 'Password is empty').notEmpty()
], authController.postLogin);

router.get('/signup', authController.getSignup);

router.post('/signup', [
    body('name', 'Please fill your name').notEmpty(),
    body('email')
        .notEmpty().withMessage('Please fill your email')
        .normalizeEmail()
        .isEmail().withMessage('Please enter a valid email')
        .custom(async value => {
            const user = await User.findOne({ email: value });
            if (user) throw new Error();
        }).withMessage('Email already exist'),
    body('password')
        .notEmpty().withMessage('Please enter your password')
        .isLength({ min: 8 }).withMessage('Password length at least 8 characters')
        .isLength({ max: 16 }).withMessage('Password length max 16 characters')
        .matches(/^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|\\;:'",.<>/?]+$/).withMessage('Space do not allowed in password'),
    body('confirmPassword')
        .bail()
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => value === req.body.password).withMessage('Password do not match')
], authController.postSignUp);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;