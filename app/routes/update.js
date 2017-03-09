var express = require('express');
var updateRoutes = express.Router();

var debug = require('debug')('Missio:routes:updates');
var fs = require('fs');

var database = require('../config/database');

var SQL_USER_UPDATES_FOR_ID = fs.readFileSync(__dirname + '/../sql/userUpdatesForId.sql', 'utf8').trim();

module.exports = function (reqAuth) {


  updateRoutes.get('/', reqAuth.loginOpt, function (req, res, next) {
    var userId = req.query.userId || 0;

    database.query(SQL_USER_UPDATES_FOR_ID, 
    { 
      replacements: { 
        userId: userId,
        limit: +req.query.limit || 10,
        offset: +req.query.offset || 0
      },
      raw: true, 
      nest: true
    }).then(function (updates) {
      updates = mapUpdateValues(updates);
      res.json({ success: true, data: updates});
    })

  });

  return updateRoutes;

}

function mapUpdateValues (updates) {
  updates.map(function (update) {
    update.user.isProjectLeader = (update.user.isProjectLeader === 1) ? true : (update.user.isProjectLeader === 0) ? false : update.user.isProjectLeader;
    update.user.isCompanion = (update.user.isCompanion === 1) ? true : (update.user.isCompanion === 0) ? false : update.user.isCompanion;
  })
  return updates;
}