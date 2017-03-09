var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var User = require('./user');
var Project = require('./project');
var ActPreset = require('./actPreset');

var Act = sequelize.define('act', {
  projectId: Sequelize.INTEGER,
  userId: Sequelize.INTEGER,
  actPresetId: Sequelize.INTEGER,
  otherActText: Sequelize.TEXT,
  followUp: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  }
});

User.hasMany(Act);
Act.belongsTo(User);

Project.hasMany(Act);
Act.belongsTo(Project);

Act.belongsTo(ActPreset)



module.exports = Act;