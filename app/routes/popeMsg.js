var express = require('express');
var popeMsgRoutes = express.Router();

var messages = ['That, rejecting the culture of indifference, we may care for our neighbors who suffer, especially the sick and the poor.',
  'That all people of good will may work together for peace.',
  'That people may learn to respect creation and care for it as a gift of God.',
  'That immigrants and refugees may find welcome and respect in the countries to which they come. ',
  'That political responsibility may be lived at all levels as a high form of charity.',
  'That opportunities for education and employment may increase for all young people.',
  'That human trafficking, the modern form of slavery, may be eradicated.',
  'That all may experience the mercy of God.',
  'That all cultures may respect the rights and dignity of women.',
  'That the mentally disabled may receive the love and help they need for a dignified life.'];

module.exports = function (reqAuth) {

  popeMsgRoutes.get('/', function (req, res, next) {
    res.json({ success: true, data: messages[Math.floor(Math.random() * messages.length)] });
  });

  return popeMsgRoutes;

}