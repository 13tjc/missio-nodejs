var express = require('express');
var giveRoutes = express.Router();

var util = require( "util" );
var accounting = require('accounting');
var async = require('async');

var memcached = require('../config/memcached');
var cyberSource = require('../config/cybersource');

var Give = require('../models/give');
var Billing = require('../models/billing');
var Update = require('../models/update');
var User = require('../models/user');
var Project = require('../models/project');
var ProjectView = require('../models/projectView');
var Follow = require('../models/follow');

var pushNotify = require('../utils/pushNotify');

var NetSuite = require('../utils/netsuite');

var GENERAL_FUND_AMOUNT = 5;

module.exports = function (reqAuth) {

  giveRoutes.post('/:id/give/', reqAuth.loginReq, function (req, res, next) {
    if (!req.body.amount) return res.status(400).json({ success: false, message: 'Missing parameters.' });

    var donationAmount = +req.body.amount;
    var generalFundAmount = req.body.generalFund && req.body.generalFund.toLowerCase() == 'true' ? GENERAL_FUND_AMOUNT : 0;
    var oneHourFromNow = new Date();
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

    var transactionFee = Math.round(100 * (donationAmount * 0.05))/100;
    var total_amount = donationAmount + generalFundAmount + transactionFee;

    var giveInfo = {
      userId: req.user.id,
      projectId: +req.params.id,
      creditCardValid: false,
      donation_amount: donationAmount,
      donation_amount_string: accounting.formatMoney(donationAmount, '$', 2),
      generalFundAmount: generalFundAmount,
      generalFundAmount_string: accounting.formatMoney(generalFundAmount, '$', 2),
      transactionFee: transactionFee,
      transactionFee_string: accounting.formatMoney(transactionFee, '$', 2),
      total_amount: total_amount,
      total_amount_string: accounting.formatMoney(total_amount, '$', 2),
      transactionId: guid(),
      showGiftAid: false,
      expires: oneHourFromNow.toISOString()
    }

    checkBillingInfo(giveInfo, function (err, dataObj) {

      memcached.set(util.format('missio-give-%s-%s', dataObj.userId, dataObj.transactionId), dataObj, 3600, function (err) {
        if (err) return res.json({ success: false, message: 'Server Error.' });

        memcached.set(util.format('missio-give-ext-session-key-%s', dataObj.transactionId), { sessionID: req.sessionID }, 300, function (err) {
          return res.json({ success: true, data: sanitize(dataObj) });
        })

      });
    })

  });

  giveRoutes.get('/:id/give/:transactionId', reqAuth.loginReq, function (req, res, next) {

    memcached.get(util.format('missio-give-%s-%s', req.user.id, req.params.transactionId), function (err, data) {
      if (err) return res.json({ success: false, message: err });
      if (!data) return res.json({ success: false, message: 'Transaction expired.' });

      checkBillingInfo(data, function (err, dataObj) {

        return res.json({ success: true, data: sanitize(dataObj) });

      })
    });

  });

  giveRoutes.post('/:id/give/:transactionId', reqAuth.loginReq, function (req, res, next) {

    memcached.get(util.format('missio-give-%s-%s', req.user.id, req.params.transactionId), function (err, data) {
      if (err) return res.json({ success: false, message: err });
      if (!data) return res.json({ success: false, message: 'Transaction expired.' });

      var anonymous = typeof req.body.anonymous === 'string' ? req.body.anonymous.toLowerCase() == 'true' ? true : false : req.body.anonymous;
      var giftAid = typeof req.body.giftAid === 'string' ? req.body.giftAid.toLowerCase() == 'true' ? true : false : req.body.giftAid;

      var fields = {
        amount: '' + data.total_amount,
        payment_token: data.payment_token,
        currency: data.currency
      }

      User.findById(data.userId).then(function (user) {
        Project.findById(data.projectId).then(function (project) {

          data.userNSID = user.nsId;
          data.projectNSID = project.nsId;

          NetSuite.addDonation(data, function (err, response) {
            if (err) return res.json({ success: false, message: err });
            if (!response.data.ccapproved) return res.json({ success: false, message: 'Transaction declined.', data: response.id });

            Give.create({
              transactionId: String(response.id),
              projectId: data.projectId,
              userId: data.userId,
              donationAmount: +data.donation_amount,
              totalAmount: +data.total_amount,
              chargedAmount: +response.data.total,
              transactionFeeAmount: +data.transactionFee,
              currency: data.currency,
              generalFundAmount: +data.generalFundAmount,
              anonymous: anonymous,
              giftAid: giftAid,
              nsId: response.id
            })

            memcached.del(util.format('missio-give-%s-%s', req.user.id, req.params.transactionId), function (err) {

            })

            Update.create({
              projectId: data.projectId,
              message: util.format('%s donated %s.', anonymous ? 'Anonymous user' : req.user.firstName, accounting.formatMoney(+data.donation_amount, '$', 0)),
              mediaType: null,
              mediaUrl: null,
              userId: anonymous ? 0 : req.user.id,
              type: 'give'
            })

            followProject(data.projectId, data.userId)

            ProjectView.findById(data.projectId).then(function (project) {
              var message = util.format('%s has been funded!', project.project_name)

              if (project.percent_funded >= 1) {
                Update.create({
                  projectId: data.projectId,
                  message: message,
                  mediaType: null,
                  mediaUrl: null,
                  userId: project.project_leader,
                  type: 'give'
                })

                Follow.findAll({
                  where: {
                    projectId: data.projectId
                  },
                  attributes: ['userId']
                }).then(function (followers) {
                  followers = followers.map(function (obj) {
                    return obj.userId
                  })

                  function iterator (userId, cb) {
                    pushNotify.send(userId, {title: '', body: message, payload: { project: project.id }})
                  }

                  async.each(followers, iterator)

                })

              }
            })

            return res.json({ success: true });
          })
        })
      })

    });

  });

  return giveRoutes;

}

function checkBillingInfo (dataObj, done) {
  Billing.unscoped().findOne({
    where: {
      userId: dataObj.userId
    }
  }).then(function (billingInfo) {
    dataObj.currency = 'USD';

    if (!billingInfo || !billingInfo.cardToken) return done(null, dataObj);

    dataObj.creditCardValid = true;
    dataObj.cardType = billingInfo.cardType;
    dataObj.cardTypeName = getCardTypeName(billingInfo.cardType);
    dataObj.cardNumber = billingInfo.cardNumber;
    dataObj.cardLastFour = billingInfo.cardNumber.substr(-4);
    dataObj.payment_token = billingInfo.cardToken;

    done(null, dataObj);
    
  })
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

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + s4() + s4();
}

function sanitize (obj) {
  var newObj = {
    creditCardValid: obj.creditCardValid,
    donation_amount: obj.donation_amount,
    total_amount: obj.total_amount,
    generalFundAmount: obj.generalFundAmount,
    transactionFee: obj.transactionFee,
    transactionId: obj.transactionId,
    donation_amount_string: obj.donation_amount_string,
    generalFundAmount_string: obj.generalFundAmount_string,
    transactionFee_string: obj.transactionFee_string,
    total_amount_string: obj.total_amount_string,
    currency: obj.currency,
    cardType: obj.cardType,
    cardNumber: obj.cardNumber,
    expires: obj.expires
  }
  return newObj;
}

function followProject (projectId, userId, cb) {
  cb = cb || function () {}

  Project.findById(projectId).then(function (project) {
    if (!project) return cb('Invalid project id.');

    project.addFollower(userId).then(function () {
      cb();
    }).catch(function (err) {
      cb();
    })
  });
}

/**
 * Placing logic here for preriodically checking NetSuite for transaction updates (can be moved)
 */

function updateTransactions () {

  Give.findAll().then(function (transactions) {
    if (!transactions || !transactions.length) return

    for (var i = 0; i < transactions.length; i++) {
      if (!transactions[i].nsId) continue

      (function (transaction) {
        NetSuite.getDonation(transaction.nsId, function (err, obj) {
          if (obj.paymentevent && obj.paymentevent.length && obj.paymentevent[0].amount) {
            transaction.chargedAmount = obj.paymentevent[0].amount
            transaction.save().then(function (trans) {

            }).catch(function (err) {
              console.error(err)
            })
          }

        })
      })(transactions[i])

    }

  })
  
}

var SECONDS = 1000;
var MINUTES = 60 * SECONDS;
var HOURS = 60 * MINUTES;

setInterval(updateTransactions, 6 * HOURS)

