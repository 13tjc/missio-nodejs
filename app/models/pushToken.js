var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var User = require('./user');

var PushToken = sequelize.define('push_token', {
  userId: Sequelize.INTEGER,
  type: {
    type: Sequelize.ENUM,
    values: ['apn', 'gcm']
  },
  token: {
    type: Sequelize.STRING,
    unique: true
  }
});

User.hasMany(PushToken);
PushToken.belongsTo(User);


module.exports = PushToken;