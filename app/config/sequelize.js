var Sequelize = require('sequelize');

module.exports = new Sequelize('missio', 'root', 'unx4Mh3zHVTPyBEt', {
  host: process.env.DB || 'localhost',
  port: process.env.DBPORT || 3306,
  dialect: 'mysql',
  logging: !!process.env.DB,

  dialectOptions: {
    multipleStatements: true
  },

  pool: {
    max: 10,
    min: 0,
    idle: 10000
  }

});

/*  host: process.env.DB || 'mdb', */
/*'missio',root', 'rd112358'*/