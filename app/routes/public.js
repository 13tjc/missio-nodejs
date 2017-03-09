var express = require('express');
var publicRoutes = express.Router();

var database = require('../config/database');

var util = require('util');
var User = require('../models/user');
var Billing = require('../models/billing');

var memcached = require('../config/memcached');

var transporter = require('../config/sendmail');

var fs = require('fs'); // THOMAS RADEMAKER DEEP-LINKING


module.exports = function (reqAuth) {

  /*
  publicRoutes.get('/test',function(req,res)
  {
    var data = req.headers;
  data.route = req.route;

  
  res.json(req.headers)
  })

  publicRoutes.post('/test',function(req,res)
  {
    var data = req.headers;
  data.route = req.route;

  
  res.json(req.headers)
  })
*/

// THOMAS RADEMAKER DEEP-LINKING
var aasa = fs.readFileSync(__dirname + '/../deeplink/apple-app-site-association');
publicRoutes.get('/apple-app-site-association', function(req, res, next) {
     res.set('Content-Type', 'application/pkcs7-mime');
     res.status(200).send(aasa);
});

  publicRoutes.get('/forgot/:id', function (req, res, next) {
    database.query('SELECT `email` FROM `reset` where `token` = :token;',
    {
      replacements: {
        token: req.params.id
      },
      raw: true,
      nest: true
    }).then(function (reset) {
      if (!reset[0]) return next()
      res.render('forgot_password', {email: reset[0].email})
    })
    
  })

  publicRoutes.post('/forgot/:id', function (req, res, next) {
    database.query('CALL RESET_PASSWORD(:token, :password);',
    {
      replacements: {
        token: req.params.id,
        password: req.body.newPassword
      }
    }).spread(function (result) {
      if (!result || result.status < 1) return next()

      User.findById(result.id).then(function (user) {
        transporter.sendMail({
          from: 'no-reply@missio.org',
          to: user.email,
          subject: 'Missio Password Reset',
          template: 'forgot_thank_you_email',
          context: {user: user}
        }, function (err, info) {

          res.render('forgot_thank_you')
        });
      })

    })
    
  })



  publicRoutes.get('/give/:id', reqAuth.loginOpt, function (req, res, next) {

    if (req.user) return next();

    memcached.get(util.format('missio-give-ext-session-key-%s', req.params.id), function (err, data) {
      if (err) return next()
      if (!data) {
        req.err_msg = 'Transaction expired.'
        return next()
      }

      req.sessionID = data.sessionID

      memcached.del(util.format('missio-give-ext-session-key-%s', req.params.id), function (err) {
        res.redirect('/give/' + req.params.id)
      })

    });

  })

  publicRoutes.get('/give/:id', reqAuth.loginReq, function (req, res, next) {

    memcached.get(util.format('missio-give-%s-%s', req.user.id, req.params.id), function (err, data) {
      if (err) return res.json({ success: false, message: err });
      if (!data) {
        req.err_msg = 'Transaction expired.'
        return next()
      }

      // Get most up to date billing info
      Billing.unscoped().findOne({
        where: {
          userId: data.userId
        }
      }).then(function (billingInfo) {
        if (billingInfo && billingInfo.cardToken) {

          data.creditCardValid = true;
          data.currency = 'USD';
          data.cardType = billingInfo.cardType;
          data.cardTypeName = getCardTypeName(billingInfo.cardType);
          data.cardNumber = billingInfo.cardNumber;
          data.cardLastFour = billingInfo.cardNumber.substr(-4);
          data.payment_token = billingInfo.cardToken;
        }

        return res.render('donation_confirm', data);        
      })


    });

  })





  publicRoutes.all('*', function (req, res, next) {
    res.render('404', {message: req.err_msg})
  })

  return publicRoutes;

}


function getCardTypeName (typeCode) {
  var cardTypes = {
    '001': 'VISA',
    '002': 'MC',
    '003': 'AMEX',
    '004': 'DSC',
    '005': 'Diners Club',
    '006': 'Carte Blanche',
    '007': 'JCB',
    '014': 'EnRoute',
    '021': 'JAL',
    '024': 'Maestro',
    '031': 'Delta',
    '033': 'Visa Electron',
    '034': 'Dankort',
    '036': 'Carte Bleue',
    '037': 'Carta Si',
    '042': 'Maestro International',
    '043': 'GE Money UK card',
    '050': 'Hipercard',
    '054': 'Elo'
  }
  return cardTypes[typeCode];

}