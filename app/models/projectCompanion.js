var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var User = require('./user');
var Project = require('./project');

var ProjectCompanion = sequelize.define('project_companion', {
  projectId: {
    type: Sequelize.INTEGER
  },
  userId: {
    type: Sequelize.INTEGER
  }
});


User.belongsToMany(Project, { through: ProjectCompanion });
Project.belongsToMany(User, { as: 'Companions', through: ProjectCompanion });


module.exports = ProjectCompanion;