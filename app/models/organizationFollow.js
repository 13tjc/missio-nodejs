var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var User = require('./user');
var Organization = require('./organization');

var OrgFollow = sequelize.define('organization_follow', {
  organizationId: {
    type: Sequelize.INTEGER
  },
  userId: {
    type: Sequelize.INTEGER
  }
}, {
  indexes: [
    {
      name: 'organizationId',
      fields: ['organizationId']
    }
  ]
});

User.belongsToMany(Organization, { as: 'OrgFollows', through: OrgFollow });
Organization.belongsToMany(User, { as: 'Followers', through: OrgFollow });



module.exports = OrgFollow;