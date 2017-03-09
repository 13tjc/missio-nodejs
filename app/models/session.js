var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var User = require('./user');

var Session = sequelize.define('session', {
  sessionId: {
    type: Sequelize.STRING,
    unique: true
  },
  sessionObj: {
    type: Sequelize.STRING
  },
  token: {
    type: Sequelize.STRING
  }
});

User.hasMany(Session);
Session.belongsTo(User);


module.exports = Session;