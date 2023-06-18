const { body } = require('express-validator');
const path = require('path');

const express = require('express');

const adminController = require('../controllers/admin');

const router = express.Router();

// /admin/add-product => GET
router.get('/add-product', adminController.getAddProduct);

// /admin/products => GET
router.get('/products', adminController.getProducts);

// /admin/add-product => POST
router.post('/add-product', [
    body('title')
        .notEmpty().withMessage('Product name can\'t be empty')
        .isLength({ max: 100 }),
    body('price')
        .notEmpty().withMessage('Please enter the product price')
        .isInt().withMessage('Please use integer number for the price'),
    body('description')
        .notEmpty().withMessage('Please fill the product description')
        .isLength({ max: 1000 }).withMessage('Description can\'t exceeded 1000 characters')
], adminController.postAddProduct);

router.get('/edit-product/:productId', adminController.getEditProduct);

router.post('/edit-product', [
    body('title')
        .notEmpty().withMessage('Product name can\'t be empty')
        .isLength({ max: 100 }),
    body('price')
        .notEmpty().withMessage('Price can\'t be empty')
        .isInt().withMessage('Please use integer number for the price'),
    body('description')
        .notEmpty().withMessage('Please fill the product description')
        .isLength({ max: 1000 }).withMessage('Description can\'t exceeded 1000 characters')
], adminController.postEditProduct);

router.delete('/delete-product/:productId', adminController.deleteProduct);

module.exports = router;
