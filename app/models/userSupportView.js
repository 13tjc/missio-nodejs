var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var UserSupportView = sequelize.define('view_user_support', {
  userId: Sequelize.INTEGER,
  projectId: Sequelize.INTEGER,
  category_no: Sequelize.INTEGER,
  subcategory_no: Sequelize.INTEGER,
  type_no: Sequelize.INTEGER,
  subtype_no: Sequelize.INTEGER,
  type: Sequelize.STRING,
  createdAt: Sequelize.DATE
}, {
  defaultScope: {
    attributes: ['userId', 'projectId', 'category_no', 'subcategory_no', 'type']
  }
});

UserSupportView.sync = function () {
  return sequelize.query('CREATE OR REPLACE VIEW view_user_supports AS SELECT `g`.`userId`, IFNULL(`p`.`id`, 0) as `projectId`, IFNULL(`p`.`category_no`, 0) as `category_no`, IFNULL(`p`.`subcategory_no`, 0) as `subcategory_no`, "give" as `type`, `g`.`createdAt` FROM `gives` as `g` LEFT JOIN `projects` as `p` on (`g`.`projectId` = `p`.`id`) UNION ALL SELECT `a`.`userId`, IFNULL(`p`.`id`, 0) as `projectId`, IFNULL(`p`.`category_no`, 0) as `category_no`, IFNULL(`p`.`subcategory_no`, 0) as `subcategory_no`, "act" as `type`, `a`.`createdAt` FROM `acts` as `a` LEFT JOIN `projects` as `p` on (`a`.`projectId` = `p`.`id`) UNION ALL SELECT `s`.`userId`, IFNULL(`p`.`id`, 0) as `projectId`, IFNULL(`p`.`category_no`, 0) as `category_no`, IFNULL(`p`.`subcategory_no`, 0) as `subcategory_no`, "share" as `type`, `s`.`createdAt` FROM `shares` as `s` LEFT JOIN `projects` as `p` on (`s`.`projectId` = `p`.`id`);')
}

module.exports = UserSupportView;