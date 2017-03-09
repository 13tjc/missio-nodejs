var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var Diocese = require('./diocese');

var OrganizationSearchView = sequelize.define('view_search_organization', {
  type: Sequelize.STRING,
  name: Sequelize.STRING,
  address1: Sequelize.STRING,
  address2: Sequelize.STRING,
  city: Sequelize.STRING,
  state: Sequelize.STRING(2),
  zip: Sequelize.STRING,
  country_code: Sequelize.STRING(2),
  website: Sequelize.STRING,
  dioceseId: Sequelize.INTEGER,
  subcategory_no: Sequelize.INTEGER
},{
  defaultScope: {
    group: ['id']
  }
});

OrganizationSearchView.sync = function () {
  return sequelize.query('CREATE OR REPLACE VIEW `view_search_organizations` AS SELECT `o`.*, `p`.`subcategory_no` as `subcategory_no` FROM `organizations` as `o` LEFT JOIN `projects` as `p` on (`p`.`twin_parish_no` = `o`.`id`);')
}

module.exports = OrganizationSearchView;