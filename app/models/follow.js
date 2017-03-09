var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var User = require('./user');
var Project = require('./project');

var Follow = sequelize.define('follow', {
  projectId: {
    type: Sequelize.INTEGER
  },
  userId: {
    type: Sequelize.INTEGER
  }
});


User.belongsToMany(Project, { as: 'Follows', through: Follow });
Project.belongsToMany(User, { as: 'Followers', through: Follow });


module.exports = Follow;