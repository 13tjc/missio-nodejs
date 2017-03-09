var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var Diocese = require('./diocese');

var Organization = sequelize.define('organization', {
  type: Sequelize.STRING,
  name: Sequelize.STRING,
  address1: Sequelize.STRING,
  address2: Sequelize.STRING,
  city: Sequelize.STRING,
  state: Sequelize.STRING(2),
  zip: Sequelize.STRING,
  country_code: Sequelize.STRING(2),
  website: Sequelize.STRING,
  dioceseId: Sequelize.INTEGER
});

Organization.belongsTo(Diocese);

module.exports = Organization;