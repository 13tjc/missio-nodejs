var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var User = require('./user');
var Project = require('./project');

var Share = sequelize.define('share', {
  projectId: Sequelize.INTEGER,
  userId: Sequelize.INTEGER,
  platform: {
    type: Sequelize.ENUM,
    values: ['facebook', 'twitter', 'googleplus', 'email'],
    allowNull: false
  },
  emailAddresses: Sequelize.STRING,
  sharedToCount: Sequelize.INTEGER
});

User.hasMany(Share);
Share.belongsTo(User);

Project.hasMany(Share);
Share.belongsTo(Project);



module.exports = Share;