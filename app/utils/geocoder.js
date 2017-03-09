var request = require('superagent');
var util = require('util');

module.exports = new Geocoder('AIzaSyDThRg51rQPoZRYrlkijc5I12ut0e4qV1E');

function Geocoder (api_key) {
  this.url = 'https://maps.googleapis.com/maps/api/geocode/json';
  this.key = {'key': api_key};
}

Geocoder.prototype.postalCode = function(postalCode, countryCode, done) {
  if (typeof countryCode === 'function') {
    done = countryCode;
    countryCode = ''
  }
  var postalCodeString = util.format('postal_code:%s', postalCode);
  var countryCodeString = util.format('country:%s', countryCode || '');
  var queryParams =  { 'components': [postalCodeString, countryCodeString].join('|') };

  request.post(this.url).query(this.key).query(queryParams).end(function (err, response) {
    if (err) return done(err);
    done(response.body);
  })

};

Geocoder.prototype.geocodeLoc = function(countryCode, adminArea, locality, done) {
  if (typeof adminArea === 'function') {
    done = adminArea;
    adminArea = ''
    locality = ''
  } else if (typeof locality === 'function') {
    done = locality;
    locality = ''
  }

  var localityString = util.format('locality:%s', locality);
  var adminAreaString = util.format('administrative_area:%s', adminArea);
  var countryCodeString = util.format('country:%s', countryCode || '');
  var queryParams =  { 'components': [localityString, adminAreaString, countryCodeString].join('|') };

  request.post(this.url).query(this.key).query(queryParams).end(function (err, response) {
    if (err) return done(err);
    var retVal = response.body && response.body.results && response.body.results.length ? response.body.results[0].geometry.location : undefined
    done(retVal);
  })
};

Geocoder.prototype.formatAddress = function(countryCode, adminArea, locality, done) {
  if (typeof adminArea === 'function') {
    done = adminArea;
    adminArea = ''
    locality = ''
  } else if (typeof locality === 'function') {
    done = locality;
    locality = ''
  }

  var localityString = util.format('locality:%s', locality);
  var adminAreaString = util.format('administrative_area:%s', adminArea);
  var countryCodeString = util.format('country:%s', countryCode || '');
  var queryParams =  { 'components': [localityString, adminAreaString, countryCodeString].join('|') };

  request.post(this.url).query(this.key).query(queryParams).end(function (err, response) {
    if (err) return done(err);
    var retVal = response.body && response.body.results && response.body.results.length ? response.body.results[0].formatted_address : undefined
    done(retVal);
  })
};

Geocoder.prototype.normalizeLoc = function(country, adminArea, locality, done) {
  var localityString = util.format('locality:%s', locality);
  var adminAreaString = util.format('administrative_area:%s', adminArea);
  var countryCodeString = util.format('country:%s', country || '');
  var queryParams =  { 'components': [localityString, adminAreaString, countryCodeString].join('|') };

  request.post(this.url).query(this.key).query(queryParams).end(function (err, response) {
    if (err) return done(err);
    var retVal = response.body && response.body.results && response.body.results.length ? response.body.results[0] : undefined;

    if (!retVal) return done();

    var retObj = {};

    for (var i = 0; i < retVal.address_components.length; i++) {
      var component = retVal.address_components[i];
      
      if (component.types.indexOf('locality') > -1) {
        retObj.locality = component.short_name;
        continue;
      }
      if (component.types.indexOf('administrative_area_level_1') > -1) {
        retObj.adminArea = component.short_name;
        continue;
      }
      if (component.types.indexOf('country') > -1) {
        retObj.country = component.short_name;
        continue;
      }
    };

    done(retObj);
  })
};