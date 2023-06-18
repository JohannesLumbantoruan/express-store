const nodemailer = require('nodemailer');
const sendGridTransport = require('nodemailer-sendgrid-transport');

const transporter = nodemailer.createTransport(sendGridTransport({
    auth: {
        api_key: process.env.SENDGRID
    }
}));

transporter.sendMail({
    to: 'johannestrikardo@gmail.com',
    from: 'johannes@express-shop.com',
    subject: 'Signup Successfully',
    html: '<h1>Thank you for joining us. Now you can login and use all our features. Happy shopping!'
})
.then(result => console.log(result))
.catch(err => console.log(err));