var request = require('superagent');
var cheerio = require('cheerio');
var crypto = require('crypto');


function CyberSource (profile_id, api_key, secret_key) {
  this._profile_id = profile_id || '';
  this._api_key = api_key || '';
  this._secret_key = secret_key || '';
}

CyberSource.prototype.createToken = function(fields, done) {
  var self = this;

  fields.access_key = self._api_key;
  fields.profile_id = self._profile_id;
  fields.transaction_uuid = guid();
  fields.signed_date_time = (new Date()).toISOString().replace(/\.[0-9]{3}Z/, 'Z');
  fields.locale = 'en';
  fields.reference_number = '' + (new Date()).getTime();
  fields.payment_method = 'card';
  fields.transaction_type = 'create_payment_token';
  fields.signed_field_names = 'access_key,profile_id,transaction_uuid,signed_date_time,locale,transaction_type,reference_number,currency,signed_field_names,unsigned_field_names';
  fields.unsigned_field_names = getUnsignedFields(fields);

  fields.signature = sign(fields, self._secret_key);

  var req = request.post('https://secureacceptance.cybersource.com/silent/token/create')
    .type('form')
    .send(fields)
    .end(function (err, response) {
      var $ = cheerio.load(response.text);
      var formData = $('form');

      var responseObject;

      if (response.status === 200) {
        responseObject = serializeObject(formData);
        if (responseObject.reason_code != 100) {
          if (responseObject.required_fields) { 
            return done(responseObject.message + ' [' + responseObject.required_fields + ']')
          } else {
            return done(responseObject.message)
          }
        }
        if (responseObject.signature !== sign(responseObject, self._secret_key)) return done('Authorization response signature failed validation.');
        return done(null, responseObject);
      } else {
        return done(response.text);
      }

    });

}

CyberSource.prototype.pay = function(fields, done) {
  var self = this;

  fields.access_key = self._api_key;
  fields.profile_id = self._profile_id;
  fields.transaction_uuid = guid();
  fields.signed_date_time = (new Date()).toISOString().replace(/\.[0-9]{3}Z/, 'Z');
  fields.locale = 'en';
  fields.reference_number = '' + (new Date()).getTime();
  fields.payment_method = 'card';
  fields.transaction_type = 'sale';
  fields.signed_field_names = 'amount,payment_token,access_key,profile_id,transaction_uuid,signed_date_time,locale,transaction_type,reference_number,currency,signed_field_names,unsigned_field_names';
  fields.unsigned_field_names = getUnsignedFields(fields);

  fields.signature = sign(fields, self._secret_key);

  var req = request.post('https://secureacceptance.cybersource.com/silent/pay')
    .type('form')
    .send(fields)
    .end(function (err, response) {
      var $ = cheerio.load(response.text);
      var formData = $('form');

      var responseObject;

      if (response.status === 200) {
        responseObject = serializeObject(formData);
        if (responseObject.reason_code != 100) return done(responseObject.message);
        if (responseObject.signature !== sign(responseObject, self._secret_key)) return done('Authorization response signature failed validation.');
        return done(null, responseObject);
      } else {
        return done(response.text);
      }

      res.status(response.status).send(responseObject);
    });

}


module.exports = CyberSource;


// Private methods

Array.prototype.diff = function(a) {
  return this.filter(function(i) {return a.indexOf(i) < 0;});
};

function serializeObject (obj)
{
  var o = {};
  var a = obj.serializeArray();
  for (var i = 0; i < a.length; i++) {
    if (o[a[i].name] !== undefined) {
      if (!o[a[i].name].push) {
        o[a[i].name] = [o[a[i].name]];
      }
      o[a[i].name].push(a[i].value || '');
    } else {
      o[a[i].name] = a[i].value || '';
    }
  }
  return o;
};

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + s4() + s4();
}

function sign (params, secretKey) {
  var signedFieldNames = params.signed_field_names.split(',');
  var dataToSign = [];
  var signedFieldsAndValues;
  
  for (var i = 0; i < signedFieldNames.length; i++) {
    dataToSign.push(signedFieldNames[i] + '=' + params[signedFieldNames[i]]);
  }

  signedFieldsAndValues = dataToSign.join(',');

  var hmac = crypto.createHmac('sha256', secretKey);
  hmac.setEncoding('base64');
  hmac.write(signedFieldsAndValues);
  hmac.end();
  return hmac.read();
}

function getUnsignedFields (params) {
  var allFieldNames = Object.keys(params);
  var signedFieldNames = params.signed_field_names.split(',');
  
  return allFieldNames.diff(signedFieldNames).join(',');
}