const bcrypt = require('bcryptjs');
// const nodemailer = require('nodemailer');
// const sendGridTransport = require('nodemailer-sendgrid-transport');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const User = require('../models/user');

// const transporter = nodemailer.createTransport(sendGridTransport({
//   auth: {
//     api_key: process.env.SENDGRID
//   }
// }));

exports.getLogin = (req, res, next) => {
  if (req.session.isLoggedIn) return res.redirect('/');
  
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: req.flash('error'),
    errorValidation: req.flash('validation'),
    email: req.flash('email'),
    invalid: req.flash('invalid')
  });
};

exports.getSignup = (req, res, next) => {  
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Sign Up',
    errorMessage: req.flash('error'),
    errorValidation: req.flash('validation'),
    name: req.flash('name'),
    email: req.flash('email')
  });
};

exports.postLogin = (req, res, next) => {
  const { email, password } = req.body;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    let error = '<ul>';
    errors.array({ onlyFirstError: true }).forEach(err => error += `<li>${err.msg}</li>`);
    error += '</ul>';
    req.flash('validation', error);
    req.flash('email', email);
    req.flash('invalid', errors.array({ onlyFirstError: true }))
    return res.redirect('/login');
  }

  bcrypt.compare(password, req.user.password, (err, result) => {
    if (err || !result) {
      console.log(err, result);
      req.flash('email', email);
      req.flash('error', 'Wrong password.');
      req.flash('invalid', { path: 'password' });

      return res.redirect('/login');
    }

    if (result) {
      req.session.user = req.user;
      req.session.isLoggedIn = true;
  
      req.session.save(err => {
        if (err) console.log(err);
        
        return res.redirect('/');
      });
    }
  });
};

exports.postSignUp = (req, res, next) => {
  const { name, email, password } = req.body;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    let error = '<ul>';
    errors.array({ onlyFirstError: true }).forEach(err => error += `<li>${err.msg}</li>`);
    error += '</ul>';
    req.flash('validation', error);
    req.flash('name', name);
    req.flash('email', email);
    return res.redirect('/signup');
  }  

  bcrypt.hash(password, 12)
    .then(hash => {
      const newUser = new User({
        name,
        email,
        password: hash,
        cart: {
          items: []
        }
      });

      return newUser.save();
    })
    .then(() => {
      res.redirect('/login')
      return sgMail.send({
        to: email,
        from: 'johannestrikardo@gmail.com',
        subject: 'Signup Successfully',
        html: '<h1>Thank you for joining us. Now you can login and enjoy all our features. Happy shopping!'
      });
    })
    .then(() => console.log('Email sent'))
    .catch(err => console.log(err));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    if (err) console.log(err);

    res.redirect('/login');
  });
};

exports.getReset = (req, res, next) => {
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: req.flash('error')
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex');
    User.findOne({ email: req.body.email })
      .then(user => {
        if (!user) {
          req.flash('error', 'No account with this email exist.');
          return res.redirect('/reset');
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then(() => {
        return sgMail.send({
          to: req.body.email,
          from: 'johannestrikardo@gmail.com',
          subject: 'Password reset',
          html: `
          <h1>Password reset request</h1>
          <h2>Click this <a href="http://localhost:3000/reset/${token}">link</a> to reset your password</h2>
          `
        });
      })
      .then(() => {
        console.log('Email sent')
        res.redirect('/');
      })
      .catch(err => console.log(err));
  });
};

exports.getNewPassword = (req, res, next) => {
  const { token } = req.params;

  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      if (!user) {
        req.flash('error', 'Token invalid or expired.');
        return res.redirect('/login');
      }

      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'Update password',
        errorMessage: req.flash('error'),
        userId: user._id.toString(),
        passwordToken: token
      });
    })
    .catch(err => console.log(err));
};

exports.postNewPassword = (req, res, next) => {
  const { password, passwordToken, userId } = req.body;

  User.findOne({ resetToken: passwordToken, resetTokenExpiration: { $gt: Date.now() },_id: userId})
    .then(user => {
      if (!user) {
        req.flash('error', 'Token invalid or expired.');
        res.redirect('/login');
      }
      
      bcrypt.hash(password, 12)
        .then(hash => {
          user.password = hash;
          user.resetToken = undefined;
          user.resetTokenExpiration = undefined;
          return user.save();
        })
        .then(() => res.redirect('/login'))
        .catch(err => console.log(err));
    })
    .catch(err => console.log(err));
};