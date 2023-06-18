module.exports = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        req.flash('error', 'Login first to use this feature.');
        return res.redirect('/login');
    }

    next();
}