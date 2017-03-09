var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var User = require('./user');
var Project = require('./project');
var Organization = require('./organization');

var OrgUpdate = sequelize.define('organization_update', {
  organizationId: {
    type: Sequelize.INTEGER
  },
  userId: {
    type: Sequelize.INTEGER
  },
  projectId: {
    type: Sequelize.INTEGER
  },
  message: {
    type: Sequelize.STRING
  },
  mediaType: {
    type: Sequelize.STRING
  },
  mediaUrl: {
    type: Sequelize.STRING
  },
  md5: {
    type: Sequelize.STRING
  }
});


OrgUpdate.belongsTo(User);
OrgUpdate.belongsTo(Project);
Organization.hasMany(OrgUpdate);



module.exports = OrgUpdate;