var express = require('express');
var userRoutes = express.Router();

var debug = require('debug')('Missio:routes:user');
var util = require('util');
var fs = require('fs');
var path = require('path');
var async = require('async');
var accounting = require('accounting');

var database = require('../config/database');
var User = require('../models/user');
var UserGeo = require('../models/userGeo');
var UserView = require('../models/userView');
var UserSearchView = require('../models/userSearchView');
var UserDetailView = require('../models/userDetailView');
var UserSupportView = require('../models/userSupportView');
var ProjectView = require('../models/projectView');
var PushToken = require('../models/pushToken');

var geocoder = require('../utils/geocoder');
var markUpdatesRead = require('../utils/markUpdatesRead');

var SQL_USER_UPDATES_ALL = fs.readFileSync(__dirname + '/../sql/userUpdatesAll.sql', 'utf8').trim();

module.exports = function (reqAuth) {

  // Attach /billing route to /user
  var billingRoutes = require('./billing')(reqAuth);
  userRoutes.use('/me/billing', billingRoutes);

  // Attach /billing route to /user
  var alikeRoutes = require('./alike')(reqAuth);
  userRoutes.use('/alike', alikeRoutes);

  userRoutes.get('/', reqAuth.isAuthorized, reqAuth.loginOpt, function (req, res) {
    var whereObj = {};
    var order = [];
    
    if (req.query.order) {
        var dir = req.query.dir === 'DESC' ? 'DESC' : 'ASC';
        order.push([req.query.order, dir]);
    }

    if (req.user) whereObj.id = { $ne: req.user.id }

    var searchText = req.query.search || '';
    if (req.query.search) whereObj.$or = [{ firstName: { $like: '%' + searchText + '%' } },{ lastName: { $like: '%' + searchText + '%' } },{ fullName: { $like: '%' + searchText + '%' } },{ city: { $like: '%' + searchText + '%' } },{ state: { $like: '%' + searchText + '%' } },{ country: { $like: '%' + searchText + '%' } },{ email: { $like: '%' + searchText + '%' } }];

    if (req.query.countryCode)
      whereObj.country = { $like: req.query.countryCode };

    var projectFocus = util.isArray(req.query.projectFocus) ? req.query.projectFocus.filter(function(v){return !!v}  ) : [];
    if (projectFocus.length)
      whereObj.subcategoryTouched = { $in: projectFocus}

    if (req.query.email)
      whereObj.email = req.query.email.trim();
  
    whereObj.id = {$and: {$gt:0} }  //anonymous user 0 is excluded - ben
  
    UserSearchView.findAll({
      where: whereObj,
      order: order,
      limit: req.query.limit || 0,
      offset: req.query.offset || 0
    }).then(function (users) {
      if (!users) return res.json({ success: false, message: 'Server Error.'});
      if (!users.length) return res.json({ success: true, data: [], message: 'No Users found.'});

      res.json({ success: true, data: users });
    })

  });

  userRoutes.get('/me', reqAuth.loginReq, function (req, res) {

    UserDetailView.findById(req.user.id).then(function (user) {
      if (!user) return res.json({ success: false, message: 'No Users found.'});
      user.dataValues.unread = 0;
      res.json({ success: true, data: { user: user } });
    })

  });

  userRoutes.post('/me', reqAuth.loginReq, function (req, res) {
    
    User.findOne({
      where: {
        id: req.user.id
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'city', 'state', 'zip', 'country', 'isCatholic', 'organizationId', 'image', 'password']
    }).then(function (user) {
      if (!user) return res.json({ success: true, message: 'No user for id.' });

      var file, fileType, fileUrl;
      var imgRegex = new RegExp(/^image\/(?:png|jpe?g).*/i);

      if (req.files && req.files.image) {
        file = req.files.image[0];
        if (file.truncated) return res.json({ success: false, message: 'File size limit exceeded.'});

        fileType = file.mimetype;
        fileUrl = "https://missio.org/_media/" + path.basename(file.path);
        //fileUrl = 'https://' + req.headers.host + '/' + path.relative(path.dirname(require.main.filename), file.path); // THOMAS RADEMAKER

        if (!imgRegex.test(fileType)) return res.json({ success: false, message: 'Invalid file type.'});

      }

      if (!req.body.currentPassword && req.body.newPassword) return res.json({ success: false, message: 'Current password required when setting new password.'});
      if (!req.body.currentPassword && req.body.email) return res.json({ success: false, message: 'Current password required when setting email.'});
      if (req.body.newPassword && req.body.currentPassword == req.body.newPassword) return res.json({ success: false, message: 'New password is the same as the current password.'});

      user.verifyPassword(req.body.currentPassword || null, function (err, passwordVerified) {
        if (req.body.currentPassword && (err || !passwordVerified)) return res.json({ success: false, message: 'Incorrect password.'});

        var updateVals = {
          firstName: req.body.firstName || user.firstName,
          lastName: req.body.lastName || user.lastName,
          email: req.body.email || user.email,
          city: req.body.city || user.city,
          state: req.body.state || user.state,
          zip: req.body.zip || user.zip,
          country: req.body.country || user.country,
          isCatholic: req.body.isCatholic || user.isCatholic,
          organizationId: req.body.organizationId || user.organizationId,
          image: fileUrl || user.image
        }

        if (passwordVerified && req.body.newPassword) {
          user.setPassword(req.body.newPassword, function (err, user) {
            if (err) return res.json({ success: false, message: err});
            if (!user) return res.json({ success: false, message: 'Server error.'});

            updateUser();  
          })
        } else {
          updateUser();
        }

        function updateUser () {
          user.update(updateVals).then(function (user) {
            if (!user) return res.json({ success: false, message: 'Server error.'});
            if (req.body.city && req.body.state && req.body.country) {
              geocoder.geocodeLoc(user.country, user.state, user.city, function (location) {
                if (!location) return;
                UserGeo.upsert({
                  userId: user.id,
                  geo: { type: 'Point', coordinates: [location.lat, location.lng]}
                }).then(function (created) {
                  // res.json({ success: true })
                }).catch(function (err) {
                  // res.json({ success: false, message: err.message});
                });
              })
            }
            res.json({ success: true, data: { user: user } });
          }).catch(function (err) {
            res.json({ success: false, message: err.message});
          });
        }


      })

    });
  });

  userRoutes.get('/me/unread', reqAuth.loginReq, function (req, res) {

    database.query('SELECT (IFNULL(pu.updates, 0) + IFNULL(ou.updates, 0)) `updates.total`, IFNULL(um.unread, 0) `chat.total`, IFNULL(c.`from`, 0) `chat.user`, COUNT(c.`read`) `chat.unread` FROM `view_unread_updates` pu left join `view_unread_organization_updates` ou on (pu.userId = ou.userId) left join cometchat c on (c.to = pu.userId and c.read = 0) left join `view_unread_messages` um on (um.userId = pu.userId) WHERE `pu`.`userId` = :userId GROUP BY `chat.user`;', 
      {
        replacements: {
          userId: req.user.id
        },
        raw: true,
        nest: true
      }).then(function (rows) {

        if (!rows.length) return res.json({ success: true, data: { updates: { total: 0 }, chat: { total: 0, users: { } }, total: 0} });

        if (rows.length === 1) {
          rows[0].chat.users = {};
            rows[0].chat.users[rows[0].chat.user] = rows[0].chat.unread;
            delete rows[0].chat.user;
            delete rows[0].chat.unread;
        }

        var reduced = rows.reduce(function (prev, curr, i) {
          var obj = {};
          if (!prev.chat.users) {
            prev.chat.users = {};
            prev.chat.users[prev.chat.user] = prev.chat.unread;
            delete prev.chat.user;
            delete prev.chat.unread;
          }
          prev.chat.users[curr.chat.user] = curr.chat.unread;

          return prev
        })

        reduced.total = reduced.updates.total + reduced.chat.total;

        res.json({ success: true, data: reduced });
        // res.json({ success: true, data: { total: 10, updates: { total: 6}, chat: { total: 4, users: [{2: 1}, {36: 3}] } } });
      })

    

  });

  userRoutes.get('/:id', reqAuth.isAuthorized, reqAuth.loginOpt, function (req, res) {
    if (isNaN(req.params.id)) return res.json({ success: false, message: 'Invalid user id.'});
    UserDetailView.findById(req.params.id).then(function (user) {
      if (!user) return res.json({ success: false, message: 'No Users found.'});

      var asyncCalls = {};

      // If current user is logged in not the same user being retrieved
      if (req.user && req.user.id !== +req.params.id) {
        function getDistance (callback) {
          database.query('SELECT 3956*2*ASIN(SQRT(POWER(SIN((X(ug1.geo)-X(ug2.geo))*pi()/180/2),2)+COS(X(ug1.geo)*pi()/180)*COS(X(ug2.geo)*pi()/180)*POWER(SIN((Y(ug1.geo)-Y(ug2.geo))*pi()/180/2),2))) AS distance FROM userGeos ug1 LEFT JOIN userGeos ug2 ON (ug2.userId = :userId) WHERE ug1.userId = :currentUserId;',
          {
            replacements: {
              userId: req.params.id,
              currentUserId: req.user.id
            },
            raw: true,
            nest: true
          }).then(function (distance) {
            var distance = distance.length ? distance[0].distance : undefined;
            if (!distance || distance > 25) return callback(null);

            distance = util.format("< %d Miles Apart", (Math.floor(distance / 5) + 1) * 5);
            return callback(null, distance);
          })
        }

        function getProjects (callback) {
          database.query('SELECT p.project_name FROM view_user_supports vus1 LEFT JOIN view_user_supports vus2 ON (vus2.userId = :userId) LEFT JOIN projects p on (vus1.projectId = p.id) WHERE vus1.userId = :currentUserId AND vus1.projectId = vus2.projectId GROUP BY vus1.projectId;',
          {
            replacements: {
              userId: req.params.id,
              currentUserId: req.user.id
            },
            raw: true,
            nest: true
          }).then(function (projectNames) {
            if (!projectNames.length) return callback(null);
            var projectNames = projectNames.map(function (p) {return p.project_name});
            return callback(null, projectNames);
          })
        }

        function getAffiliation (callback) {
          database.query('SELECT o.name FROM users u1 LEFT JOIN users u2 ON (u2.id = :userId) LEFT JOIN organizations o ON (u1.organizationId = o.id) WHERE u1.id = :currentUserId AND u1.organizationId = u2.organizationId;',
          {
            replacements: {
              userId: req.params.id,
              currentUserId: req.user.id
            },
            raw: true,
            nest: true
          }).then(function (org) {
            if (!org.length) return callback(null);
            var org = org[0].name;
            return callback(null, org);
          })
        }

        function getLocality (callback) {
          database.query('SELECT country, state, city FROM users WHERE id = :userId OR id = :currentUserId;',
          {
            replacements: {
              userId: req.params.id,
              currentUserId: req.user.id
            },
            raw: true,
            nest: true
          }).then(function (users) {
            var matched = users.reduce(function (prev, curr, i) {
              if (!prev) return curr  
              var isWrongArea = false
              var keys = Object.keys(curr);
              return keys.map(function (val, i) {
                if (!prev[val] || !curr[val]) return '';
                var isSame = prev[val].toLowerCase() == curr[val].toLowerCase();
                if (!isSame) isWrongArea = true
                return isSame && !isWrongArea ? prev[val] : '';
              })
            }, false)
            matched.push(function (resp) {
              callback(null, resp)
            })
            geocoder.formatAddress.apply(geocoder, matched)
          })
        }

        asyncCalls.distance = getDistance;
        asyncCalls.projects = getProjects;
        asyncCalls.affiliation = getAffiliation;
        asyncCalls.locality = getLocality;
      }

      async.parallel(asyncCalls, function (err, results) {
        user.dataValues.alike = results
        res.json({ success: true, data: { user: user } });
      });

      
    })

  });


  userRoutes.get('/me/geo', reqAuth.loginReq, function (req, res) {

    UserGeo.findById(req.user.id).then(function (userGeo) {
      var coordinates = { lat: null, lon: null}
      if (userGeo) {
        coordinates.lat = userGeo.geo.coordinates[0]
        coordinates.lon = userGeo.geo.coordinates[1]
      }
      res.json({ success: true, data: coordinates})
    })

  });

  userRoutes.post('/me/geo', reqAuth.loginReq, function (req, res) {
    if (!req.body.lat || !req.body.lon) return res.status(400).json({ success: false, message: 'Invalid parameters. Lat and Long required.'});
    if (req.body.lat < -90 || req.body.lat > 90 || req.body.lon < -180 || req.body.lon > 180) return res.status(400).json({ success: false, message: 'Invalid parameters. Lat and Long are out of bounds.'});
    UserGeo.upsert({
      userId: req.user.id,
      geo: { type: 'Point', coordinates: [req.body.lat, req.body.lon]}
    }).then(function (created) {
      res.json({ success: true })
    }).catch(function (err) {
      res.json({ success: false, message: err.message});
    });

  });

  userRoutes.get('/:id/updates', reqAuth.loginOpt, function (req, res, next) {
    var userId;
    if (req.params.id === 'me') {
      if (!req.user) return res.sendStatus(401);
      userId = req.user.id
    } else {
      userId = req.params.id
    }

    User.sequelize.query(SQL_USER_UPDATES_ALL, 
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

      markUpdatesRead(req.user.id, updates)

      res.json({ success: true, data: updates});
    })

  });


  userRoutes.get('/:id/projects/:status?', reqAuth.loginOpt, function (req, res, next) {
    var userId;
    if (req.params.id === 'me') {
      if (!req.user) return res.sendStatus(401);
      userId = req.user.id
    } else {
      userId = req.params.id
    }

    var statuses = ['open', 'closed', 'funded', 'complete'];

    if (req.params.status === 'ongoing') statuses = ['open'];
    if (req.params.status === 'ended') statuses = ['closed', 'funded'];
    if (req.params.status === 'active') statuses = ['open', 'closed', 'funded'];
    if (req.params.status === 'complete') statuses = ['complete'];

    database.query('SELECT `vus`.* FROM (SELECT `userId`, `projectId`, `createdAt` FROM `view_user_supports` UNION ALL SELECT `project_leader` AS `userId`, `id` AS `projectId`, `createdAt` FROM `projects` UNION ALL SELECT `userId`, `projectId`, `createdAt` FROM `project_companions` GROUP BY `projectId`, `userId`) `vus` LEFT JOIN `view_user_supports` `vus2` ON (`vus`.`userId` = `vus2`.`userId` AND `vus`.`projectId` = `vus2`.`projectId` AND `vus`.`createdAt` = `vus2`.`createdAt`) WHERE `vus`.`userId` = :userId GROUP BY `projectId` ORDER BY `createdAt` DESC;', 
    { replacements: { 
        userId: userId
      },
      raw: true, 
      nest: true 
    }).then(function (projIds) {
      var projIds = projIds.map(function (obj) {return obj.projectId});
      

      var statusIterator = function (status, callback) {
        ProjectView.findAll({
          where: {
            id: {
              $in: projIds
            },
            project_status: status
          }
        }).then(function (projects) {
          projects.sort(function (a, b) {
            return projIds.indexOf(a.id) - projIds.indexOf(b.id)
          })
          var metaIterator = function (proj, callback) {
            proj.dataValues['project_cost_string'] = accounting.formatMoney(proj.project_cost, '$', 0);
            proj.dataValues['total_contributions_string'] = accounting.formatMoney(proj.total_contributions, '$', 0);
            proj.dataValues['contributions_needed_string'] = accounting.formatMoney(Math.min(proj.project_cost - proj.total_contributions, 0), '$', 0);

            proj.addUserMeta(req.user, function (modifiedProj) {
              callback(null, modifiedProj);
            })
          }

          async.map(projects, metaIterator, function (err, results) {
            callback(null, projects)
          })
        })
      }

      async.map(statuses, statusIterator, function (err, results) {
        var respObj;
        if (results.length < 4) {
          var merged = [];
          respObj = merged.concat.apply(merged, results);
        } else {
          respObj = {
            ongoing: results[0],
            ended: results[1].concat(results[2]),
            complete: results[3]
          }
        }
        res.json({ success: true, data: respObj });
      })

      
    })
  })

  return userRoutes;

}

function mapUpdateValues (updates) {
  updates.map(function (update) {
    update.user.isProjectLeader = (update.user.isProjectLeader === 1) ? true : (update.user.isProjectLeader === 0) ? false : update.user.isProjectLeader;
    update.user.isCompanion = (update.user.isCompanion === 1) ? true : (update.user.isCompanion === 0) ? false : update.user.isCompanion;
  })
  return updates;
}