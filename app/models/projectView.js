var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var User = require('./user');
var UserView = require('./userView');
var UserSupportView = require('./userSupportView');
var Organization = require('./organization');
var Diocese = require('./diocese');
var Follow = require('./follow');

var ProjectView = sequelize.define('view_project', {
  whoimpacted: Sequelize.STRING,
  howmanybenefit: Sequelize.INTEGER,
  institution_latitude: Sequelize.STRING,
  institution_longtitude: Sequelize.STRING,
  project_latitude: Sequelize.STRING,
  project_longtitude: Sequelize.STRING,
  facebook_link: Sequelize.STRING,
  twitter_link: Sequelize.STRING,
  project_start_date: Sequelize.DATE,
  project_end_date: Sequelize.DATE,
  project_cost: Sequelize.DECIMAL(10, 2),
  category_no: Sequelize.INTEGER,
  subcategory_no: Sequelize.INTEGER,
  category_other: Sequelize.STRING,
  subcategory_other: Sequelize.STRING,
  type_no: Sequelize.INTEGER,
  subtype_no: Sequelize.INTEGER,
  type_other: Sequelize.STRING,
  subtype_other: Sequelize.STRING,
  uploaded_date: Sequelize.DATE,
  published_date: Sequelize.DATE,
  donations: {
    type: Sequelize.TEXT,
    get: function () {
      if (!('donations' in this.dataValues)) return;
      var obj = []
      try {
        obj = JSON.parse(this.getDataValue('donations'));
      } catch (e) {

      }
      return obj;
    }
  },
  challenge_info: { // THOMAS RADEMAKER : MISSIO_CHALLENGE
    type: Sequelize.TEXT,
    get: function () {
      if (!('challenge_info' in this.dataValues)) return;
      var obj = []
      try {
        obj = JSON.parse(this.getDataValue('challenge_info'));
      } catch (e) {

      }
      return obj;
    }
  },
  twin_relation: Sequelize.BOOLEAN,
  twin_with: Sequelize.STRING,
  twin_with_other: Sequelize.STRING,
  twin_diocese_no: Sequelize.INTEGER,
  twin_parish_no: Sequelize.INTEGER,
  project_images_url: {
    type: Sequelize.TEXT,
    get: function () {
      if (!('project_images_url' in this.dataValues)) return;
      var obj = []
      try {
        obj = JSON.parse(this.getDataValue('project_images_url'));
      } catch (e) {
        
      }
      return obj;
    }
  },
  project_no: {
    type: Sequelize.INTEGER,
    unique: true
  },
  project_name: Sequelize.STRING,
  description: Sequelize.STRING,
  institution_name: Sequelize.STRING,
  address: Sequelize.STRING,
  city: Sequelize.STRING,
  state_province: Sequelize.STRING,
  country: Sequelize.STRING,
  country_code: Sequelize.STRING,
  postal_code: Sequelize.STRING,
  diocese_name: Sequelize.STRING,
  project_leader: Sequelize.INTEGER,
  project_leader_name: Sequelize.STRING,
  added_date: Sequelize.DATE,
  updated_date: Sequelize.DATE,
  status: Sequelize.STRING,
  complete: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  featured_image_url: Sequelize.STRING,
  added_date_text: Sequelize.STRING,
  pastoral_evangelizing_effort: Sequelize.BOOLEAN,
  currency: Sequelize.STRING,
  project_funding_end_date: Sequelize.DATE,
  days_remaining: Sequelize.INTEGER,
  total_contributions: Sequelize.DECIMAL(10, 2),
  percent_funded: Sequelize.DECIMAL,
  give_count: Sequelize.INTEGER,
  share_count: Sequelize.INTEGER,
  act_count: Sequelize.INTEGER,
  follower_count: Sequelize.INTEGER,
  project_companions: {
    type: Sequelize.STRING,
    get: function () {
      if (!('project_companions' in this.dataValues)) return;
      var obj = []
      try {
        obj = this.getDataValue('project_companions').split(',').map(function (val) {
          return +val;
        });
      } catch (e) {

      }
      return obj;
    }
  },
  project_status: {
    type: Sequelize.ENUM,
    values: ['pending', 'open', 'closed', 'funded', 'complete']
  }
}, {
  defaultScope: { // THOMAS RADEMAKER
    attributes: ['id', 'project_name', 'project_no', 'description', 'institution_name', 'address', 'city', 'state_province', 'country', 'country_code', 'postal_code', 'diocese_name', 'project_leader', 'project_leader_name', 'status', 'featured_image_url', 'pastoral_evangelizing_effort', 'project_start_date', 'project_end_date', 'percent_funded', 'project_cost', 'total_contributions', 'follower_count', 'give_count', 'share_count', 'act_count', 'days_remaining', 'category_no', 'type_no', 'challenge_info'] // THOMAS RADEMAKER : MISSIO_CHALLENGE
  },
  scopes: {
    mini: {
      where: {
        project_status: { $ne: 'pending'}
      },// THOMAS RADEMAKER
      attributes: ['id', 'project_name', 'days_remaining', 'give_count', 'share_count', 'act_count', 'follower_count', 'address', 'city', 'state_province', 'country', 'featured_image_url', 'category_no', 'type_no']
    }
  },
  instanceMethods: {
    addUserMeta: function (user, done) {
      var project = this;

      project.dataValues.following = false
      project.dataValues.gave = false;
      project.dataValues.shared = false;
      project.dataValues.acted = false;

      if (!user) return done(project);;

      var userId = user.id;

      Follow.findOne({
        where: {
          projectId: project.id,
          userId: userId
        }
      }).then(function (follow) {
        if (follow) project.dataValues.following = true;

        UserSupportView.findAll({
          where: {
            projectId: project.id,
            userId: userId
          },
          group: ['type']
        }).then(function (supports) {
          supports.map(function (support) {
            if (support.type === 'give') project.dataValues.gave = true;
            if (support.type === 'share') project.dataValues.shared = true;
            if (support.type === 'act') project.dataValues.acted = true;
          });

          return done(project);
        })
      });
    },
    addLeaderMeta: function (done) {
      var project = this;

      project.dataValues.leader = {};

      if (!project.dataValues.project_leader) return done(project);

      UserView.scope('mini').findById(project.dataValues.project_leader).then(function (user) {
        if (!user) return done(project);

        project.dataValues.leader = user;

        return done(project);
      });
    },
    addOrgMeta: function (done) {
      var project = this;

      project.dataValues.organizations = [];

      var orgType, orgModel, orgId;

      if (project.twin_diocese_no) {
        orgId = project.twin_diocese_no;
        orgType = 'diocese';
        orgModel = Diocese;
      }

      if (project.twin_parish_no) {
        orgId = project.twin_parish_no;
        orgType = 'parish';
        orgModel = Organization;
      }

      if (!orgType) return done(project);

      orgModel.findById(orgId).then(function (org) {
        if (!org) return done(project);

        if (orgType === 'diocese') project.dataValues.organizations.push({id: org.id, name: 'Diocese of ' + org.name, type: 'diocese'});
        if (orgType === 'parish') project.dataValues.organizations.push({id: org.id, name: org.name, type: org.type});
        return done(project);
      });
    }
  }
});

ProjectView.sync = function () {
  return sequelize.query('CREATE OR REPLACE VIEW `view_projects` AS SELECT p.*, pm.currency, pm.project_funding_end_date, pm.days_remaining, pm.total_contributions, pm.percent_funded, pm.give_count, pm.share_count, pm.act_count, pm.follower_count, pm.project_companions, IF (p.complete, "complete", IF(pm.project_funded, "funded", IF(pm.project_open, "open", IF(p.project_start_date > now(), "pending", "closed")))) as project_status FROM `projects` as `p` LEFT JOIN `view_project_meta` `pm` on (`p`.`id` = `pm`.`id`);')
}


module.exports = ProjectView;