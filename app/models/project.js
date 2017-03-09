var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var User = require('./user');

var Project = sequelize.define('project', {
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
    },
    set: function (obj) {
      this.setDataValue('donations', JSON.stringify(obj));
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
    },
    set: function (obj) {
      this.setDataValue('project_images_url', JSON.stringify(obj));
    }
  },
  project_no: {
    type: Sequelize.INTEGER,
    unique: true
  },
  project_name: Sequelize.STRING,
  description: Sequelize.TEXT,
  institution_name: Sequelize.STRING,
  address: Sequelize.STRING,
  city: Sequelize.STRING,
  state_province: Sequelize.STRING,
  country: Sequelize.STRING,
  country_code: Sequelize.STRING(2),
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
  nsId: Sequelize.INTEGER,
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
    },
    set: function (obj) {
      this.setDataValue('challenge_info', JSON.stringify(obj));
    }
  }
}, {
  defaultScope: {
    attributes: ['id', 'project_no', 'project_name', 'description', 'institution_name', 'address', 'city', 'state_province', 'country', 'country_code', 'postal_code', 'diocese_name', 'project_leader', 'project_leader_name', 'status', 'featured_image_url', 'project_start_date', 'project_end_date', 'nsId']
  }
});

Project.belongsTo(User, { foreignKey: 'project_leader' });


module.exports = Project;