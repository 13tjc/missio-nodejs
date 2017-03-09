var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var UserGeo = sequelize.define('userGeo', {
  userId: {
    type: Sequelize.INTEGER,
    primaryKey: true
  },
  geo: {
    type: Sequelize.GEOMETRY('POINT'),
    allowNull: false
  }
}, {
  indexes: [
    {
      name: 'geo',
      type: 'SPATIAL',
      fields: ['geo']
    }
  ],
  engine: 'MYISAM'
})

module.exports = UserGeo;