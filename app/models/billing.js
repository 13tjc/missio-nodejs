var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var User = require('./user');

var Billing = sequelize.define('billing', {
  userId: {
    type: Sequelize.INTEGER,
    unique: true
  },
  firstName: Sequelize.STRING,
  lastName: Sequelize.STRING,
  address1: Sequelize.STRING,
  address2: Sequelize.STRING,
  country: Sequelize.STRING,
  city: Sequelize.STRING,
  state: Sequelize.STRING,
  zip: Sequelize.STRING,
  cardType: Sequelize.STRING,
  cardNumber: Sequelize.STRING,
  cardExpiryDate: Sequelize.STRING,
  cardToken: Sequelize.STRING
}, {
  freezeTableName: true,
  defaultScope: {
    attributes: ['userId', 'firstName', 'lastName', 'address1', 'address2', 'country', 'city', 'state', 'zip', 'cardType', 'cardNumber', 'cardExpiryDate']
  }
});

User.hasOne(Billing);
Billing.belongsTo(User);



module.exports = Billing;