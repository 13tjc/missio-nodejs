var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var UserSearchView = sequelize.define('view_search_user', {
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
  isCompanion: Sequelize.BOOLEAN,
  projectTouched: Sequelize.INTEGER,
  subcategoryTouched: Sequelize.INTEGER
}, {
  defaultScope: {
    group: ['id'],
    attributes: ['id', 'firstName', 'lastName', 'fullName', 'email', 'city', 'state', 'zip', 'country', 'isCatholic', 'organizationId', 'image', 'isProjectLeader', 'isCompanion']
  }
});

UserSearchView.sync = function () {
  return sequelize.query('CREATE OR REPLACE VIEW view_search_users AS SELECT u.*, IFNULL(us.projectId, 0) as projectTouched, IFNULL(us.subcategory_no, 0) as subcategoryTouched FROM view_users as u LEFT JOIN view_user_supports as us on (us.userId = u.id);')
}


module.exports = UserSearchView;