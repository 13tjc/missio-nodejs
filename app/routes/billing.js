var express = require('express');
var billingRoutes = express.Router();

var cyberSource = require('../config/cybersource');
var NetSuite = require('../utils/netsuite');

var User = require('../models/user');
var Billing = require('../models/billing');

var geocoder = require('../utils/geocoder');

module.exports = function (reqAuth) {

  billingRoutes.get('/', reqAuth.loginReq, function (req, res, next) {

    Billing.findOne({
      where: {
        userId: req.user.id
      }
    }).then(function (billingInfo) {
      billingInfo = billingInfo || {};

      return res.json({ success: true, data: billingInfo });
    });

  });
  
  billingRoutes.post('/', reqAuth.loginReq, function (req, res, next) {

    var fields = {};

    geocoder.normalizeLoc(req.body.country, req.body.state, req.body.city, function (locObj) {
      if (!locObj) return res.json({ success: false, message: 'Invalid city, state, or country.' });

      var expiryDate = req.body.cardExpiryDate || '';
      if (expiryDate) {
        if (expiryDate.length >= 6 && expiryDate.indexOf('-') < 0)
          expiryDate = expiryDate.substr(0,2) + '-' + expiryDate.substr(2,4)
      }

      fields.bill_to_forename = req.body.firstName || '';
      fields.bill_to_surname = req.body.lastName || '';
      fields.bill_to_email = req.user.email || '';
      fields.bill_to_address_line1 = req.body.address1 || '';
      fields.bill_to_address_line2 = req.body.address2 || '';
      fields.bill_to_address_city = locObj.locality || '';
      fields.bill_to_address_state = locObj.adminArea || '';
      fields.bill_to_address_postal_code = req.body.zip || '';
      fields.bill_to_address_country = locObj.country || '';
      fields.currency = 'USD';
      fields.card_type = req.body.cardType || '';
      fields.card_number = req.body.cardNumber || '';
      fields.card_expiry_date = expiryDate;
      fields.card_cvn = req.body.cardCvn || '';

      cyberSource.createToken(fields, function (err, responseObject) {
        if (err) return res.json({ success: false, message: err });

        User.findById(req.user.id).then(function (user) {
          if (user.nsId) {
            NetSuite.editDonor(user, responseObject, billingInfoCallback);
          } else {
            NetSuite.addDonor(user, responseObject, billingInfoCallback);
          }

          function billingInfoCallback (ns_resp) {
            if (!ns_resp.success) return res.json({ success: false, message: ns_resp.message });
            user.update({ nsId: ns_resp.id }).then(function (user) {
              Billing.upsert({
                userId: user.id,
                firstName: responseObject.req_bill_to_forename,
                lastName: responseObject.req_bill_to_surname,
                address1: responseObject.req_bill_to_address_line1,
                address2: responseObject.req_bill_to_address_line2,
                country: responseObject.req_bill_to_address_country,
                city: responseObject.req_bill_to_address_city,
                state: responseObject.req_bill_to_address_state,
                zip: responseObject.req_bill_to_address_postal_code,
                cardType: responseObject.req_card_type,
                cardNumber: responseObject.req_card_number,
                cardExpiryDate: responseObject.req_card_expiry_date,
                cardToken: responseObject.payment_token
              }).then(function (created) {
                return res.json({ success: true });
              });
            })
          }
        })
        
      });
    });

  });

  return billingRoutes;

}