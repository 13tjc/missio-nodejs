var nodemailer = require('nodemailer');
var sendmailTransport = require('nodemailer-sendmail-transport');
var hbs = require('nodemailer-express-handlebars');
var exphbs  = require('express-handlebars');

var transporter = nodemailer.createTransport(sendmailTransport({}));

transporter.use('compile', hbs({viewEngine: exphbs.create({defaultLayout: 'email', extname: '.hbs'}), viewPath: 'views', extName: '.hbs'}));

module.exports = transporter;