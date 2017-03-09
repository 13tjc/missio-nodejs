var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var ActPreset = sequelize.define('act_preset', {
  actText: Sequelize.TEXT
});


module.exports = ActPreset;