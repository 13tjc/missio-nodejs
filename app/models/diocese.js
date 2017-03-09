var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var Diocese = sequelize.define('diocese', {
  name: Sequelize.STRING,
  country_code: Sequelize.STRING
});

module.exports = Diocese;