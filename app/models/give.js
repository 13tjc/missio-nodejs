var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var User = require('./user');
var Project = require('./project');

var Give = sequelize.define('give', {
  transactionId: Sequelize.STRING,
  projectId: Sequelize.INTEGER,
  userId: Sequelize.INTEGER,
  donationAmount: Sequelize.DECIMAL(10, 2),
  totalAmount: Sequelize.DECIMAL(10, 2),
  chargedAmount: Sequelize.DECIMAL(10, 2),
  transactionFeeAmount: Sequelize.DECIMAL(10, 2),
  currency: Sequelize.STRING,
  generalFundAmount: Sequelize.DECIMAL(10, 2),
  anonymous: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  giftAid: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  nsId: Sequelize.INTEGER
});

User.hasMany(Give);
Give.belongsTo(User);

Project.hasMany(Give);
Give.belongsTo(Project);



module.exports = Give;