var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var UserView = sequelize.define('view_user', {
  firstName: {
    type: Sequelize.STRING
  },
  lastName: {
    type: Sequelize.STRING
  },
  fullName: Sequelize.STRING,
  email: {
    type: Sequelize.STRING,
    unique: true,
    validate: {
      isEmail: { msg: 'Invalid email.' }
    }
  },
  city: Sequelize.STRING,
  state: Sequelize.STRING,
  zip: Sequelize.STRING,
  country: Sequelize.STRING,
  isCatholic: {
    type: Sequelize.ENUM,
    values: ['N/A', 'Yes', 'No'],
    defaultValue: 'N/A',
    allowNull: false
  },
  organizationId: Sequelize.INTEGER,
  image: Sequelize.STRING,
  isProjectLeader: Sequelize.BOOLEAN,
  isCompanion: Sequelize.BOOLEAN
}, {
  scopes: {
    mini: {
      attributes: ['id', 'firstName', 'lastName', 'fullName', 'image', 'isProjectLeader', 'isCompanion']
    }
  }
});

UserView.sync = function () {
  return sequelize.query('CREATE OR REPLACE VIEW view_users AS SELECT user.id, user.firstName, user.lastName, user.fullName, user.email, user.city, user.state, user.zip, user.country, user.image, user.isCatholic, user.organizationId, user.createdAt, user.updatedAt, IF (p.project_leader IS NOT NULL, true, false) as isProjectLeader, IF (pc.projectId IS NOT NULL, true, false) as isCompanion FROM users as user LEFT JOIN projects as p on (user.id = p.project_leader) LEFT JOIN project_companions as pc on (user.id = pc.userId) GROUP BY user.id;')
}


module.exports = UserView;