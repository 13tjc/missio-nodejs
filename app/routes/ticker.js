var express = require('express');
var tickerRoutes = express.Router();

var fs = require('fs');
var accounting = require('accounting');
var database = require('../config/database');

var SQL_TICKER_STATS = fs.readFileSync(__dirname + '/../sql/tickerStats.sql', 'utf8').trim();

module.exports = function (reqAuth) {

  tickerRoutes.get('/', function (req, res, next) {

    database.query(SQL_TICKER_STATS, {raw: true, nest: true}).then(function (data) {
      var data = data[0];
      var stats = [
        {
          title: 'Missio Users',
          value: '' + data.users
        },
        {
          title: 'Active Projects',
          value: '' + data.projectsOpen
        },
        {
          title: 'Given to Projects',
          value: accounting.formatMoney(data.totalDonations, '$', 0)
        },
        // {
        //   title: 'Completed Projects',
        //   value: '' + data.projectsCompleted
        // },
        {
          title: 'People Impacted',
          value: accounting.formatNumber(data.peopleHelped, 0)
        }
      ];

      res.json({ success: true, data: stats });

    })

  });

  return tickerRoutes;

}