var express = require('express');
var projRoutes = express.Router();

var debug = require('debug')('Missio:routes:project');
var fs = require('fs');
var path = require('path');
var util = require('util');
var async = require('async');
var database = require('../config/database');
var memcached = require('../config/memcached');



var User = require('../models/user');
var Update = require('../models/update');
var Follow = require('../models/follow');
var Project = require('../models/project');
var ProjectView = require('../models/projectView');
var ProjectCompanion = require('../models/projectCompanion');

var inputMask = require('../utils/inputMask');
var markUpdatesRead = require('../utils/markUpdatesRead');
var pushNotify = require('../utils/pushNotify');

var request = require('superagent');
var accounting = require('accounting');

var SQL_PROJ_UPDATES_ALL = fs.readFileSync(__dirname + '/../sql/projUpdatesAll.sql', 'utf8').trim();
var SQL_PROJ_UPDATES = fs.readFileSync(__dirname + '/../sql/projUpdates.sql', 'utf8').trim();

module.exports = function (reqAuth) {

  var giveRoutes = require('./give')(reqAuth);
  projRoutes.use('/', giveRoutes);

  var shareRoutes = require('./share')(reqAuth);
  projRoutes.use('/', shareRoutes);

  var actRoutes = require('./act')(reqAuth);
  projRoutes.use('/', actRoutes);

  projRoutes.get('/', reqAuth.loginOpt, function (req, res, next) {

    var whereObj = {};
    var order = [];
    
    if (req.query.order) {
        var dir = req.query.dir === 'DESC' ? 'DESC' : 'ASC';
        order.push([req.query.order, dir]);
    }

    var status = {$ne: 'pending', $in: []};
    whereObj.project_status = status;

    if (req.query.search) whereObj.$or = [{ project_name: {$like: '%' + req.query.search + '%'} },{ address: {$like: '%' + req.query.search + '%'} },{ city: {$like: '%' + req.query.search + '%'} },{ state_province: {$like: '%' + req.query.search + '%'} },{ country: {$like: '%' + req.query.search + '%'} }];

    if (req.query.countryCode)
      whereObj.country_code = { $like: req.query.countryCode };

    var subcategory = util.isArray(req.query.subcategory) ? req.query.subcategory.filter(function(v){return !!v}) : [];
    if (subcategory.length)
      whereObj.subcategory_no = { $in: subcategory}
    
    var daysRemaining = util.isArray(req.query.daysRemaining) ? req.query.daysRemaining : [];
    daysRemaining = daysRemaining.map(function (val) {
      var splitVal = val.split(/[-+]/).map(function(v){return isNaN(+v)?v:+v});
      if (splitVal[0] <= splitVal[1]) return { $between: splitVal }
      if (splitVal[0] > splitVal[1]) return { $gte: splitVal[0] }
      if (Number.isInteger(splitVal[0])) return splitVal[0]
        status.$in.push( splitVal[0] )
      return false;
    }).filter(function (v) {return !!v});

    var percentFunded = util.isArray(req.query.percentFunded) ? req.query.percentFunded : [];
    percentFunded = percentFunded.map(function (val) {
      var splitVal = val.split(/[-+]/).map(function(v){return isNaN(+v)?v:+v/100});
      if (splitVal[0] <= splitVal[1]) return { $between: splitVal }
      if (splitVal[0] > splitVal[1]) return { $gte: splitVal[0] }
      if (!isNaN(splitVal[0])) return splitVal[0]
      if (/funded/i.test(splitVal[0])) return 1;
      return false;
    }).filter(function (v) {return !!v});

    if (!status.$in.length) delete status.$in;

    if (daysRemaining.length) whereObj.days_remaining = { $or: daysRemaining }
    if (percentFunded.length) whereObj.percent_funded = { $or: percentFunded }


    ProjectView.findAll({
      where: whereObj,
      order: order,
      limit: req.query.limit || 0,
      offset: req.query.offset || 0
    }).then(function (projects) {
      if (!projects) return res.json({ success: false, message: 'Server Error.'});
      if (!projects.length) return res.json({ success: true, data: [], message: 'No Projects found.'});

      var iterator = function (proj, callback) {
        proj.addUserMeta(req.user, function (modifiedProj) {
          callback(null, modifiedProj);
        })
      }

     async.map(projects, iterator, function (err, results) {
        res.json({ success: true, data: projects });
      })

     
    })

    inputMask.getProjects(req);
  });

  projRoutes.get('/featured', reqAuth.loginOpt, function(req, res, next) {
    var userId = req.user && req.user.id ? req.user.id : 0; // THOMAS RADEMAKER : update project DB
    Update.sequelize.query("SELECT `id`, `project_name`, `project_no`, `description`, `institution_name`, `address`, `city`, `state_province`, `country`, `country_code`, `postal_code`, `diocese_name`, `project_leader`, `project_leader_name`, `status`, `featured_image_url`, `pastoral_evangelizing_effort`, `project_start_date`, `project_end_date`, `percent_funded`, `project_cost`, `total_contributions`, `follower_count`, `give_count`, `share_count`, `act_count`, `days_remaining`, `category_no`, `challenge_info`, `type_no` FROM view_projects WHERE project_status != 'pending' ORDER BY days_remaining DESC, percent_funded ASC;", {
      replacements: {
        userId: userId
      },
      model: ProjectView
    }).then(function(projects) {
      if (!util.isArray(projects)) {
        var projects = Object.keys(projects).map(function (key) {return projects[key]});
      }

      var projects = projects.map(function (obj) {
        obj.dataValues['project_cost_string'] = accounting.formatMoney(obj.dataValues.project_cost, '$', 0);
        return obj;
      })

      var iterator = function (proj, callback) {
        proj.addUserMeta(req.user, function (modifiedProj) {
          callback(null, modifiedProj);
        })
      }

      async.map(projects, iterator, function (err, results) {
        console.log('projects ' + projects[0].thomas);
        res.json({ success: true, data: projects });
      })

    });
  });

  projRoutes.get('/following', reqAuth.loginReq, function (req, res, next) {
    // TODO: Optimize query
    Follow.findAll({
      where: {
        userId: req.user.id
      }
    }).then(function (follows) {
      if (!follows) follows = [];

      var followingIds = follows.map(function (obj) {
        return obj.projectId;
      });

      ProjectView.findAll({
        where: {
          id: {
            in: followingIds
          }
        }
      }).then(function (projects) {
        res.json({ success: true, data: projects});
      })

    });
  });

  projRoutes.get('/updates', reqAuth.loginReq, function (req, res, next) {
    Update.sequelize.query(SQL_PROJ_UPDATES_ALL, 
    { 
      replacements: { 
        userId: req.user.id,
        limit: +req.query.limit || 10,
        offset: +req.query.offset || 0
      },
      nest: true
    }).then(function (updates) {
      updates = mapUpdateValues(updates);

      markUpdatesRead(req.user.id, updates)

      res.json({ success: true, data: updates});
    })

  });

  projRoutes.get('/categories', function (req, res, next) {
    request.get('http://api.missioapp.org/portal/v1/projectcategories/' + req.params.id)
      .query({ auth_token: '4b393c61-f9ec-4c5f-9133-0ff01fb86a93'})
      .end(function (err, response) {
        res.json({ success: true, data: response.body});
      });
  });

  projRoutes.get('/types', function (req, res, next) {
    request.get('http://api.missioapp.org/portal/v1/projecttypes/' + req.params.id)
      .query({ auth_token: '4b393c61-f9ec-4c5f-9133-0ff01fb86a93'})
      .end(function (err, response) {
        res.json({ success: true, data: response.body});
      });
  });

  projRoutes.get('/:id', reqAuth.loginOpt, function (req, res, next) {
    ProjectView.unscoped().findById(req.params.id).then(function (project) {
      if (!project) return res.json({ success: false, message: 'Invalid project id.'});

      project.dataValues['project_cost_string'] = accounting.formatMoney(project.project_cost, '$', 0);
      project.dataValues['total_contributions_string'] = accounting.formatMoney(project.total_contributions, '$', 0);
      project.dataValues['missio_fund'] = 5;
      project.dataValues['missio_fund_string'] = accounting.formatMoney(5, '$', 0);

      newDonations = project.donations.map(function (obj) {
        obj.amount_string = accounting.formatMoney(obj.amount, '$', 0);
        return obj;
      });
      project.dataValues['donations'] = JSON.stringify(newDonations)

      project.addLeaderMeta(function (project) {
        project.addUserMeta(req.user, function (project) {
          debug('Added User Meta')
          project.addOrgMeta(function (project) {
            debug('Added Org Meta')
            res.json({ success: true, data: project});
          });
        });
      })
    })
  });

  projRoutes.get('/:id/updates', function (req, res, next) {
    Update.sequelize.query(SQL_PROJ_UPDATES, 
    { 
      replacements: { 
        projectId: req.params.id,
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

  projRoutes.post('/:id/updates', reqAuth.loginReq, function (req, res, next) {
    var file, fileType, fileUrl, fileMD5 = '';

    if (req.files && req.files.file) {
      file = req.files.file[0];
      if (file.truncated) return res.json({ success: false, message: 'File size limit exceeded.'});

      fileType = file.mimetype;
      //console.log('require.main.filename is ' + require.main.filename);
      //console.log('file.path is ' + file.path);
      //console.log('path.dirname(require.main.filename) is ' + path.dirname(require.main.filename));
      //console.log('path.relative(path.dirname(require.main.filename), file.path) is ' + path.relative(path.dirname(require.main.filename), file.path));
      fileUrl = "https://missio.org/_media/" + path.basename(file.path);
      //fileUrl = 'https://' + req.headers.host + '/' + path.relative(path.dirname(require.main.filename), file.path);//'https://missiocorp.net/' + path.relative(path.dirname(require.main.filename), file.path);//'https://' + req.headers.host + '/' + path.relative(path.dirname(require.main.filename), file.path);
      console.log('fileUrl ' + fileUrl);
      fileMD5 = file.md5

    } else {
      if (!req.body.message) return res.status(400).json({ success: false, message: 'A message and/or a file is expceted.'});
    }

    Update.sequelize.query('Select * FROM video WHERE md5 = :md5', 
    { 
      replacements: { 
        md5: fileMD5
      },
      raw: true, 
      nest: true
    }).then(function (videos) {

      var vimeoURL

      if (videos[0] && videos[0].video) {
        vimeoURL = videos[0].video
      }

      Update.create({
        projectId: req.params.id,
        message: req.body.message,
        mediaType: fileType,
        mediaUrl: vimeoURL || fileUrl,
        md5: fileMD5,
        userId: req.user.id
      }).then(function (update) {
        if (!update) return res.json({ success: false, message: 'Server error.'});
        followProject(req.params.id, req.user.id)

        Project.findById(update.projectId).then(function (proj) {
          if (proj.project_leader == update.userId) {

            Follow.findAll({
              where: {
                projectId: update.projectId
              },
              attributes: ['userId']
            }).then(function (followers) {
              var message = util.format('%s posted an update for %s', req.user.fullName, proj.project_name)

              followers = followers.map(function (obj) {
                return obj.userId
              }).filter(function (x) {
                return x != update.userId
              })

              function iterator (userId, cb) {
                pushNotify.send(userId, {title: '', body: message, payload: { project: update.projectId }})
              }

              async.each(followers, iterator)

            })

          }
        })


        return res.json({ success: true });
      });

    })
    
  });

  projRoutes.get('/:id/follow', reqAuth.loginReq, function (req, res, next) {
    debug('User ' + req.user.id + ' follow project ' + req.params.id)
    followProject(req.params.id, req.user.id, function (err) {
      if (err) return res.json({ success: false, message: err});
      Follow.count({
        where: {
          projectId: req.params.id
        }
      }).then(function (count) {
        res.json({ success: true, data: { follower_count: count } });
      })
    })
  });

  projRoutes.get('/:id/unfollow', reqAuth.loginReq, function (req, res, next) {
    debug('User ' + req.user.id + ' unfollow project ' + req.params.id)
    unfollowProject(req.params.id, req.user.id, function (err) {
      if (err) return res.json({ success: false, message: err});
      Follow.count({
        where: {
          projectId: req.params.id
        }
      }).then(function (count) {
        res.json({ success: true, data: { follower_count: count } });
      })
    })
  });

  projRoutes.get('/:id/alike', function (req, res, next) {
    // TODO: add alike projects logic

  	var data = [];

    database.query('call project_alike(:projectId);', {
      model: ProjectView,
      replacements: {
        projectId: req.params.id
      }
    }).spread(function(alike) {

      if (!util.isArray(alike)) {
        var alike = Object.keys(alike).map(function (key) {return alike[key]});
      }

      var iterator = function (proj, callback) {
        proj.addUserMeta(req.user, function (modifiedProj) {
          delete modifiedProj.dataValues.donations
          callback(null, modifiedProj);
        })
      }

      async.map(alike, iterator, function (err, results) {
        res.json({ success: true, data: alike});
      })

      
    })


/*
	var data = [];
    var asyncCalls = {};
	asyncCalls.getProjectsLike = getProjectsLike(req.params.id);

    var whereObj = {};

    var status = {$ne: 'pending'};
    whereObj.project_status = status;

    ProjectView.findAll({
      where: whereObj,
      limit: req.query.limit || 0,
      offset: req.query.offset || 0
    }).then(function (projects) {
      if (!projects) return res.json({ success: false, message: 'Server Error.'});
      if (!projects.length) return res.json({ success: true, data: [], message: 'No Projects found.'});

      var iterator = function (proj, callback) {
        proj.addUserMeta(req.user, function (modifiedProj) {
          callback(null, modifiedProj);
        })
      }

      async.map(projects, iterator, function (err, results) {
        res.json({ success: true, data: projects });
      })
    })
//*/    
       
  })




  return projRoutes;
}

function followProject (projectId, userId, cb) {
  cb = cb || function () {}

  Project.findById(projectId).then(function (project) {
    if (!project) return cb('Invalid project id.');

    project.addFollower(userId).then(function () {
      cb();
    }).catch(function (err) {
      cb();
    })
  });
}

function unfollowProject (projectId, userId, cb) {
  Project.findById(projectId).then(function (project) {
    if (!project) return cb('Invalid project id.');

    project.removeFollower(userId).then(function () {
      cb();
    }).catch(function (err) {
      cb();
    })
  });
}

function mapUpdateValues (updates) {
  updates.map(function (update) {
    update.user.isProjectLeader = (update.user.isProjectLeader === 1) ? true : (update.user.isProjectLeader === 0) ? false : update.user.isProjectLeader;
    update.user.isCompanion = (update.user.isCompanion === 1) ? true : (update.user.isCompanion === 0) ? false : update.user.isCompanion;
  })
  return updates;
}
