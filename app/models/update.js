var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var User = require('./user');
var Project = require('./project');

var Update = sequelize.define('update', {
  projectId: {
    type: Sequelize.INTEGER
  },
  userId: {
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
  },
  type: {
    type: Sequelize.ENUM,
    values: ['give','share','act','custom']
  }
});


Update.belongsTo(User);

Project.hasMany(Update);



module.exports = Update;