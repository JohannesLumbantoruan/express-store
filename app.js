require('dotenv').config();
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const authenticate = require('./middleware/authenticate');
const csrfProtection = csrf();

const store = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: 'sessions'
});

const errorController = require('./controllers/error');
const User = require('./models/user');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'images')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store
}));
app.use(multer({
  storage: fileStorage,
  fileFilter,
  limits: {
    fileSize: '5MB',
  }
}).single('image'));
app.use(csrfProtection);
app.use((req, res, next) => {
  if (req.session.isLoggedIn) res.locals.name = req.session.user.name;
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});
app.use(flash());

app.use('/admin', authenticate, adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get404);

app.use((err, req, res, next) => {
  console.log('Route doesn\'t exists: ' + req.path);
  let { status, message } = err;
  if (status === 500) message = 'Internal Server Error';
  res.render('404', {
    pageTitle: `${status}: ${message}`,
    path: '/error',
    status,
    message
  });
});

mongoose
  .connect(
    process.env.MONGO_URI
  )
  .then(() => {
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });
