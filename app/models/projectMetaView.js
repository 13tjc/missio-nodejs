var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var ProjectMetaView = sequelize.define('view_project_meta', {
  id: Sequelize.INTEGER,
  currency: Sequelize.STRING,
  project_funding_end_date: Sequelize.DATE,
  days_remaining: Sequelize.INTEGER,
  project_open: Sequelize.BOOLEAN,
  project_funded: Sequelize.BOOLEAN,
  total_contributions: Sequelize.DECIMAL(10, 2),
  percent_funded: Sequelize.DECIMAL,
  give_count: Sequelize.INTEGER,
  share_count: Sequelize.INTEGER,
  act_count: Sequelize.INTEGER,
  follower_count: Sequelize.INTEGER,
  project_companions: Sequelize.STRING
}, {
  freezeTableName: true
});

ProjectMetaView.sync = function () {
  return sequelize.query('CREATE OR REPLACE VIEW `view_project_meta` AS SELECT p.id, "USD" as currency, (`p`.`project_start_date` + interval 30 day) as `project_funding_end_date`, GREATEST(to_days(`p`.`project_start_date` + interval 30 day) - to_days(now()), -1) as `days_remaining`, IF(to_days(`p`.`project_start_date` + interval 30 day) - to_days(now()) BETWEEN 0 AND 30, true, false) as project_open, IF(sum(`g`.`donationAmount`) / `p`.`project_cost` >= 1, true, false) as project_funded, IFNULL(sum(`g`.`donationAmount`), 0) as `total_contributions`, LEAST(IFNULL(sum(`g`.`donationAmount`) / `p`.`project_cost`, 0), 1) as `percent_funded`, (SELECT COUNT(donationAmount) FROM gives WHERE projectId = p.id) as give_count, (SELECT COUNT(id) FROM shares WHERE projectId = p.id) as share_count, (SELECT COUNT(id) FROM acts WHERE projectId = p.id) as act_count, (SELECT COUNT(userId) FROM follows WHERE projectId = p.id) as follower_count, (SELECT GROUP_CONCAT(userId) FROM project_companions WHERE projectId = p.id GROUP BY projectId) as project_companions FROM `projects` as `p` LEFT JOIN `gives` `g` on (`p`.`id` = `g`.`projectId`) GROUP BY `p`.`id`;')
}

module.exports = ProjectMetaView;