var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var UserDetailView = sequelize.define('view_user_detail', {
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
  projectsOpen: Sequelize.INTEGER,
  projectsEnded: Sequelize.INTEGER,
  projectsCompleted: Sequelize.INTEGER,
  donations: Sequelize.INTEGER,
  shares: Sequelize.INTEGER,
  activites: Sequelize.INTEGER,
  peopleHelped: Sequelize.INTEGER
}, {
  scopes: {
    mini: {
      attributes: ['id', 'firstName', 'lastName', 'fullName', 'image', 'isProjectLeader', 'isCompanion']
    }
  }
});

UserDetailView.sync = function () {
  return sequelize.query('CREATE OR REPLACE VIEW view_user_details AS SELECT user.*, (SELECT COUNT(p.id) FROM projects as p RIGHT JOIN users as user on (user.id = p.project_leader) WHERE status != "completed" AND p.project_leader = user.id) + (SELECT COUNT(pc.projectId) FROM project_companions as pc LEFT JOIN projects as p on (pc.projectId = p.id) WHERE p.status != "completed" AND pc.userId = user.id) as projectsOpen, (SELECT COUNT(p.id) FROM projects as p RIGHT JOIN users as user on (user.id = p.project_leader) WHERE status = "completed" AND p.project_leader = user.id) + (SELECT COUNT(pc.projectId) FROM project_companions as pc LEFT JOIN projects as p on (pc.projectId = p.id) WHERE p.status = "completed" AND pc.userId = user.id) as projectsCompleted, (SELECT COUNT(donationAmount) FROM gives WHERE userId = user.id) as donations, (SELECT COUNT(id) FROM shares WHERE userId = user.id) as shares, (SELECT COUNT(id) FROM acts WHERE userId = user.id) as activites, (SELECT IFNULL(SUM(CEIL(give.donationAmount / p.project_cost * p.howmanybenefit)), 0) FROM gives as give LEFT JOIN projects as p on (give.projectId = p.id) WHERE userId = user.id) as peopleHelped FROM view_users as user;');
}

module.exports = UserDetailView;