var express = require('express');
var alikeRoutes = express.Router();
var async = require('async');
var database = require('../config/database');

var UserSearchView = require('../models/userSearchView');
var UserDetailView = require('../models/userDetailView');

module.exports = function(reqAuth) {
  alikeRoutes.get('/old', reqAuth.loginReq, function(req, res, next) {

    UserSearchView.findAll({
      limit: req.query.limit || 10,
      offset: req.query.offset || 0
    }).then(function (users) {
      if (!users) return res.json({ success: false, message: 'Server Error.'});
      if (!users.length) return res.json({ success: true, data: [], message: 'No Users found.'});

      res.json({ success: true, data: users });
    })

  });

  // This needs to return an array of users in the same format as the above call
  alikeRoutes.get('/', reqAuth.isAuthorized, reqAuth.loginReq, function(req, res, next) {

    if (isNaN(req.user.id)) return res.json({
      success: false,
      message: 'Invalid user id.'
    });

    var geo = getBool(req.query.geo);
    var zip = getBool(req.query.zip);
    var interest = getBool(req.query.interest);
    var affiliation = getBool(req.query.affiliation);

    if (!geo && !interest && !affiliation && !zip) {
      geo = true;
      zip = true;
      interest = true;
      affiliation = true;

    }

    UserDetailView.findById(req.user.id).then(function(user) {
      if (!user) return res.json({ success: false, message: 'No Users found.' });

      var asyncCalls = {};

      function getDistance(callback) {
        database.query('SELECT userGeos.userId as id, users.fullName, haversinePt((select userGeos.geo from userGeos where userGeos.userId = :currentUserId), userGeos.geo) AS distance_in_mi  FROM userGeos  left join users on users.id = userGeos.userId having distance_in_mi < 25  ORDER BY distance_in_mi;', {
          replacements: {
            userId: req.params.id,
            currentUserId: req.user.id
          },
          raw: true,
          nest: true
        }).then(function(distance) {
          //console.log(distance);
          if (!distance[0]) return callback(null, []); //handle null return - ben
          distance = distance.map(function map (obj) {
            return obj.id;
          });
          return callback(null, distance);
        })
      }

      function getZipDistance(callback) {
        database.query('SELECT DISTINCT u.id, u.fullName FROM users u where u.zip = (select zip from users where id = :currentUserId);', {
          replacements: {
            userId: req.params.id,
            currentUserId: req.user.id
          },
          raw: true,
          nest: true
        }).then(function(org) {
          if (!org[0]) return callback(null, []); //handle null return - ben
          org = org.map(function map (obj) {
            return obj.id;
          })
          return callback(null, org);
        })
      }

      function getAffiliation(callback) {
        database.query('SELECT id, fullName FROM users u1 where id in (select distinct(id) from users where organizationId in(select organizationId as id from users u where id = :currentUserId))', {
          replacements: {
            userId: req.params.id,
            currentUserId: req.user.id
          },
          raw: true,
          nest: true
        }).then(function(org) {
          if (!org[0]) return callback(null, []); //handle null return - ben
          org = org.map(function map (obj) {
            return obj.id;
          })
          return callback(null, org);
        })
      }

      function getFollows(callback) {
        database.query('SELECT  u1.id, u1.fullName, COUNT(1) AS `numOfProjects` FROM users u1 LEFT JOIN follows c ON (u1.id= c.userId) where c.userId in ( select DISTINCT(userId) from follows where follows.projectId in ( select DISTINCT(projectId) as projectId from follows where follows.userId = 27)) GROUP BY `u1`.`id` ORDER BY `numOfProjects` DESC;', {
          replacements: {
            userId: req.params.id,
            currentUserId: req.user.id
          },
          raw: true,
          nest: true
        }).then(function(org) {
          if (!org[0]) return callback(null, []); //handle null return - ben
          org = org.map(function map (obj) {
            return obj.id;
          })
          return callback(null, org);
        })
      }


      if (geo) asyncCalls.distance = getDistance;
      if (zip) asyncCalls.zip = getZipDistance;
      if (affiliation) asyncCalls.affiliation = getAffiliation;
      if (interest) asyncCalls.follows = getFollows;
      

      async.parallel(asyncCalls, function(err, results) {

        var alikes = [];

        Array.prototype.merge = function(arr) {
          var self = this;
          arr = arr.filter(function (item) {
            return self.indexOf(item) == -1
          })
          self = self.concat(arr)
          return self;
        };

        if (geo) alikes = alikes.merge(results.distance);
        if (zip) alikes = alikes.merge(results.zip);
        if (affiliation) alikes = alikes.merge(results.affiliation);
        if (interest) alikes = alikes.merge(results.follows);


        var queryObj = {
          where: {
            id: {
              $in: alikes
            }
          }
        };

        if (req.query.limit) {
          queryObj.limit = req.query.limit;
          queryObj.offset = req.query.offset || 0;
        }

        UserDetailView.scope('mini').findAll(queryObj).then(function (users) {
          res.json({ success: true, data: users });
        })

      });


    })


  });

  return alikeRoutes;

}

function getBool (val) {
  return typeof val === 'string' ? val.toLowerCase() == 'true' ? true : false : val;
}
