const path = require('path');
const { validationResult } = require('express-validator');

const pagination = require('../util/pagination');

const Product = require('../models/product');
const User = require('../models/user');
const deleteFile = require('../util/deleteFile');

exports.getAddProduct = (req, res, next) => {
  console.log(req.session.flash);

  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    title: req.flash('title'),
    imageUrl: req.flash('imageUrl'),
    price: req.flash('price'),
    description: req.flash('description'),
    invalid: req.flash('invalid'),
    errorMessage: req.flash('error'),
    errorValidation: req.flash('validation')
  });
};

exports.postAddProduct = (req, res, next) => {
  const image = req.file;  
  console.log(image);
  const title = req.body.title;
  const price = req.body.price;
  const description = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty() || !image) {
    console.log('There are errors');
    const err = errors.array({ onlyFirstError: true });
    let error = '<ul>';
    errors.array({ onlyFirstError: true }).forEach(err => error += `<li>${err.msg}</li>`);
    error += '</ul>';
    req.flash('title', title);
    req.flash('price', price);
    req.flash('description', description);
    req.flash('validation', error);
    if (!image) {
      const err = errors.array({ onlyFirstError: true });
      error = '<ul>';
      err.push({ path: 'image', msg: 'Please fill the image field or use valid image' });
      err.forEach(e => error += `<li>${e.msg}</li>`);
      req.flash('validation');
      req.flash('invalid', err);
      req.flash('validation', error);
    } else {
      req.flash('invalid', err);
    }

    return res.status(422).redirect('/admin/add-product')
  }

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: image.filename,
    userId: req.session.user
  });
  product
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      console.log(err);
      const error = err;
      error.status = 500;
      next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  Product.findOne({ userId: req.session.user._id, _id: req.params.productId })
    .then(product => {
      if (!product) {
        req.flash('error', 'Product not found or you do not have authorization to edit this product. Here the product you can change.');
        return res.redirect('/admin/products');
      }

      const editMode = req.query.edit;
      if (!editMode) {
        return res.redirect('/');
      }
      const prodId = req.params.productId;
      Product.findById(prodId)
        .then(product => {
          if (!product) {
            return res.redirect('/');
          }
          res.render('admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: editMode,
            product: product,
            errorMessage: req.flash('error'),
            errorValidation: req.flash('validation'),
            title: req.flash('title'),
            imageUrl: req.flash('imageUrl'),
            price: req.flash('price'),
            description: req.flash('description'),
            invalid: req.flash('invalid')
          });
        })
        .catch(err => console.log(err));
    })
    .catch(err => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
  const image = req.file;
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);
  // console.log(errors.array({ onlyFirstError: true }));

  if (!errors.isEmpty()) {
    let error = '<ul>';
    errors.array({ onlyFirstError: true }).forEach(err => error += `<li>${err.msg}</li>`);
    error += '</ul>';
    req.flash('invalid', errors.array({ onlyFirstError: true }));
    req.flash('validation', error);

    return res.status(422).redirect('/admin/edit-product/' + prodId + '?edit=true');
  }

  Product.findById(prodId)
    .then(async product => {
      if (!product) {
        const err = new Error('Product not found!');
        err.status = 404;
        return next(err);
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        const imagePath = path.join(process.cwd(), 'images', product.imageUrl);
        console.log(imagePath);
        try {
          await deleteFile(imagePath);
        } catch(e) {
          e.status = 500;
          return next(e);
        }
        product.imageUrl = image.filename;
      }
      product.save();
      console.log('UPDATED PRODUCT!');
      res.redirect('/admin/products');
    })
    .catch(err => console.log(err));
};

exports.getProducts = async (req, res, next) => {
  const PER_PAGE = 3;
  let { page } = req.query;
  if (page === undefined) page = 1;
  page = parseInt(page);
  const [last, previous, nextPage] = await pagination(page, Product, PER_PAGE);

  Product.find({ userId: req.session.user._id })
    .skip((page - 1) * PER_PAGE)
    .limit(PER_PAGE)
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        errorMessage: req.flash('error'),
        page,
        previous,
        nextPage,
        last
      });
    })
    .catch(err => console.log(err));
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then(async product => {
      if (!product) {
        const err = new Error('Product not found!');
        err.status = 404;
        return next(err);
      }
      try {
        const imagePath = path.join(process.cwd(), 'images', product.imageUrl);
        console.log(imagePath);
        await deleteFile(imagePath);
      } catch(e) {
        return res.status(500).json({
          status: 'error'
        });
      }

      await Product.deleteOne({ _id: product._id, userId: req.session.user._id });
      res.status(200).json({
        status: 'success'
      });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({
        status: 'error'
      })
    });
};
