const path = require('path');
const fs = require('fs');

const PDFDocument = require('pdfkit');

const pagination = require('../util/pagination');

const Product = require('../models/product');
const Order = require('../models/order');
const User = require('../models/user');

const PER_PAGE = 3;

exports.getProducts = async (req, res, next) => {
  let { page } = req.query;
  if (page === undefined) page = 1;
  page = parseInt(page);
  const [last, previous, nextPage] = await pagination(page, Product, PER_PAGE);

  Product.find()
    .skip((page - 1) * PER_PAGE)
    .limit(PER_PAGE)
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
        page,
        previous,
        nextPage,
        last
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products'
      });
    })
    .catch(err => console.log(err));
};

exports.getIndex = async (req, res, next) => {
  let { page } = req.query;
  if (page === undefined) page = 1;
  page = parseInt(page);
  // const total = await Product.countDocuments();
  // const last = Math.ceil(total / PER_PAGE);
  // const previous = parseInt(page) - 1;
  // let nextPage = parseInt(page) + 1;
  // if (Number.isNaN(page)) page = 1;
  // if (Number.isNaN(nextPage)) nextPage = 2;
  const [last, previous, nextPage] = await pagination(page, Product, PER_PAGE);
  
  Product.find()
    .skip((page - 1) * PER_PAGE)
    .limit(PER_PAGE)
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        page,
        previous,
        nextPage,
        last
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getCart = (req, res, next) => {
  User
    .findOne({ _id: req.session.user._id})
    .populate('cart.items.productId')
    .exec()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return User
        .findById(req.session.user)
        .then(user => user.addToCart(product));
    })
    .then(result => {
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  User
    .findById(req.session.user)
    .then(user => user.removeFromCart(prodId))
    .then(() => {
      res.redirect('/cart');
    })
    .catch(err => {
      console.log(err);
      err.status = 404;
      next(err);
    });
};

exports.postOrder = (req, res, next) => {
  User
    .findById(req.session.user)
    .populate('cart.items.productId')
    .exec()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          name: req.session.user.name,
          userId: req.session.user
        },
        products: products
      });

      order.save();
      return user;
    })
    .then(user => {
      return user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => console.log(err));
};

exports.getOrders = (req, res, next) => {
  if (req.session.isLoggedIn === undefined) return res.redirect('/login');

  Order.find({ 'user.userId': req.session.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
      });
    })
    .catch(err => console.log(err));
};

exports.getInvoice = (req, res, next) => {
  const { orderId } = req.params;
  Order.findById(orderId)
    .then(order => {
      if (!order) {
        const err = new Error('Order not found!');
        err.status = 404;
        return next(err);
      }

      if (order.user.userId.toString() !== req.session.user._id.toString()) {
        const err = new Error('Do not authorized!');
        err.status = 403;
        return next(err);
      }

      const invoiceName = 'invoice-' + orderId + '.pdf';
      const invoicePath = path.join('data', 'invoice', invoiceName);

      // const fileStream = fs.createReadStream(invoicePath);
      const doc = new PDFDocument();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
      doc.pipe(fs.createWriteStream(invoicePath));
      doc.pipe(res);
      doc.fontSize(20).text('Order ID: #' + order._id, { align: 'center' });
      doc.fontSize(16).text('==================================================');
      doc.moveDown();
      let total = 0;
      order.products.forEach(prod => {
        total += prod.product.price * prod.quantity;
        doc.fontSize(16).text(
          prod.product.title +
          ' - ' +
          prod.quantity +
          ' @' +
          prod.product.price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })
        );
        doc.moveDown();
    });
      doc.text('==================================================');
      doc.moveDown();
      doc.fontSize(24).text('Total: ' + total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR'} ), { align: 'right' });
      doc.end();
      // fileStream.pipe(res);      
    
      // fs.readFile(invoicePath, (err, data) => {
      //   if (err) {
      //     return next(err);
      //   }
    
      //   res.setHeader('Content-Type', 'application/pdf');
      //   res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
      //   res.send(data);
      // })
    })
    .catch(err => {
      err.status = 500;
      next(err)
    });
};