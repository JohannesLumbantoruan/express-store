exports.get404 = (req, res, next) => {
  if (req.path === '/favicon.ico') return;
  const err = new Error('Page not found!');
  err.status = 404;
  next(err);
};
