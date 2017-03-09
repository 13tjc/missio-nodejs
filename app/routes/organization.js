var express = require('express');
var orgRoutes = express.Router();

var debug = require('debug')('Missio:routes:organization');
var fs = require('fs');
var util = require('util');
var path = require('path');

var UserView = require('../models/userView');
var ProjectView = require('../models/projectView');
var Organization = require('../models/organization');
var OrganizationSearchView = require('../models/organizationSearchView');
var OrgUpdate = require('../models/organizationUpdate');
var OrgFollow = require('../models/organizationFollow');

var inputMask = require('../utils/inputMask');
var markUpdatesRead = require('../utils/markUpdatesRead');

var SQL_ORG_UPDATES_ALL = fs.readFileSync(__dirname + '/../sql/orgUpdatesAll.sql', 'utf8').trim();
var SQL_ORG_UPDATES = fs.readFileSync(__dirname + '/../sql/orgUpdates.sql', 'utf8').trim();

module.exports = function (reqAuth) {

  orgRoutes.get('/', function (req, res, next) {
    var whereObj = {};
    var order = [];
    
    if (req.query.order) {
        var dir = req.query.dir === 'DESC' ? 'DESC' : 'ASC';
        order.push([req.query.order, dir]);
    }

    if (req.query.search) 
      whereObj.$or = [{ name: { $like: '%' + req.query.search + '%' } } ,{ address1: { $like: '%' + req.query.search + '%' } } ,{ address2: { $like: '%' + req.query.search + '%' } } ,{ city: { $like: '%' + req.query.search + '%' } } ,{ state: { $like: '%' + req.query.search + '%' } }];
    if (req.query.city) 
      whereObj.city = { $like: '%' + req.query.city + '%' };
    if (req.query.state) 
      whereObj.state = { $like: '%' + req.query.state + '%' };
    if (req.query.countryCode)
      whereObj.country_code = { $like: req.query.countryCode };

    var projectFocus = util.isArray(req.query.projectFocus) ? req.query.projectFocus.filter(function(v){return !!v}  ) : [];
    if (projectFocus.length)
      whereObj.subcategory_no = { $in: projectFocus}

    OrganizationSearchView.findAll({
      where: whereObj,
      order: order,
      limit: req.query.limit || 0,
      offset: req.query.offset || 0,
      attributes: ['id', 'type', 'name', 'city', 'state', 'zip'],
      raw: true
    }).then(function (organizations) {
      if (!organizations) return res.json({ success: false, message: 'Server Error.'});
      if (!organizations.length) return res.json({ success: true, data: [], message: 'No Organizations found.'});


      res.json({ success: true, data: organizations });
    })

  });

  orgRoutes.get('/:id', reqAuth.loginOpt, function (req, res, next) {

    UserView.scope('mini').findAll({
      where: {
        organizationId: req.params.id
      }
    }).then(function (users) {
      ProjectView.scope('mini').findAll({
        where: {
          twin_parish_no: req.params.id
        }
      }).then(function (projects) {
        Organization.findById(req.params.id).then(function (organization) {
          if (!organization) return res.json({ success: false, message: 'Invalid organization id.'});

          organization.dataValues.users = users;
          organization.dataValues.projects = projects;
          organization.dataValues.following = false;

          req.missio = { organization: organization };
          if (req.user) return next();

          res.json({ success: true, data: organization});

        })
      })
    })

  });

  orgRoutes.get('/:id', reqAuth.loginReq, function (req, res, next) {
    var organization = req.missio.organization;
    OrgFollow.findOne({
      where: {
        organizationId: req.params.id,
        userId: req.user.id
      }
    }).then(function (follow) {
      organization.dataValues.following = !!follow;
      organization.dataValues.isMember = (organization.id === req.user.organizationId);

      res.json({ success: true, data: organization});
    });
    
  });

  orgRoutes.get('/:id/users', reqAuth.loginOpt, function (req, res, next) {
    var userId = req.user ? req.user.id : 0;
    UserView.findAll({
      where: {
        organizationId: req.params.id,
        id: {
          $ne: userId
        }
      }
    }).then(function (users) {
      res.json({ success: true, data: users});
    })
    
  });

  orgRoutes.get('/:id/projects', reqAuth.loginOpt, function (req, res, next) {
    ProjectView.findAll({
      where: {
        twin_parish_no: req.params.id
      }
    }).then(function (projects) {
      res.json({ success: true, data: projects});
    })
    
  });

  orgRoutes.get('/updates', reqAuth.loginReq, function (req, res, next) {
    OrgFollow.sequelize.query(SQL_ORG_UPDATES_ALL, 
    { 
      replacements: { 
        userId: req.user.id,
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


  orgRoutes.get('/:id/updates', function (req, res, next) {
    OrgFollow.sequelize.query(SQL_ORG_UPDATES, 
    {
      replacements: { 
        organizationId: req.params.id,
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

  orgRoutes.post('/:id/updates', reqAuth.loginReq, function (req, res, next) {
    var file, fileType, fileUrl, fileMD5;

    if (req.files && req.files.file) {
      file = req.files.file[0];
      if (file.truncated) return res.json({ success: false, message: 'File size limit exceeded.'});

      fileType = file.mimetype;
      fileUrl = 'https://missio.org/' + path.relative(path.dirname(require.main.filename), file.path);//'https://' + req.headers.host + '/' + path.relative(path.dirname(require.main.filename), file.path);
      fileMD5 = file.md5

    } else {
      if (!req.body.message) return res.status(400).json({ success: false, message: 'A message and/or a file is expceted.'});
    }

    OrgUpdate.create({
      organizationId: req.params.id,
      message: req.body.message,
      mediaType: fileType,
      mediaUrl: fileUrl,
      md5: fileMD5,
      userId: req.user.id
    }).then(function (update) {
      if (!update) return res.json({ success: false, message: 'Server error.'});
      followOrganization(req.params.id, req.user.id)
      return res.json({ success: true });
    });
  });

  orgRoutes.get('/:id/follow', reqAuth.loginReq, function (req, res, next) {
    debug('User ' + req.user.id + ' follow organization ' + req.params.id)
    followOrganization(req.params.id, req.user.id, function (err) {
      if (err) return res.json({ success: false, message: err});
      OrgFollow.count({
        where: {
          organizationId: req.params.id
        }
      }).then(function (count) {
        res.json({ success: true, data: { follower_count: count } });
      })
    })
  });

  orgRoutes.get('/:id/unfollow', reqAuth.loginReq, function (req, res, next) {
    debug('User ' + req.user.id + ' unfollow organization ' + req.params.id)
    unfollowOrganization(req.params.id, req.user.id, function (err) {
      if (err) return res.json({ success: false, message: err});
      OrgFollow.count({
        where: {
          organizationId: req.params.id
        }
      }).then(function (count) {
        res.json({ success: true, data: { follower_count: count } });
      })
    })
  });

  return orgRoutes;
}

function followOrganization (organizationId, userId, cb) {
  cb = cb || function () {}

  OrgFollow.findOne({
    where: {
      organizationId: organizationId,
      userId: userId
    }
  }).then(function (follow) {
    if (follow) {
      cb();
    }else {
      OrgFollow.create({
        organizationId: organizationId,
        userId: userId
      }).then(function (follow) {
        cb();
      }).catch(function (err) {
        cb(err.message);
      });
    }
  });
}

function unfollowOrganization (organizationId, userId, cb) {
  cb = cb || function () {}

  OrgFollow.findOne({
    where: {
      organizationId: organizationId,
      userId: userId
    }
  }).then(function (follow) {
    if (!follow) {
      cb();
    }else {
      follow.destroy().then(function () {
        cb();
      }).catch(function (err) {
        cb(err.message);
      });
    }
  });
}

function mapUpdateValues (updates) {
  updates.map(function (update) {
    update.user.isProjectLeader = (update.user.isProjectLeader === 1) ? true : (update.user.isProjectLeader === 0) ? false : update.user.isProjectLeader;
    update.user.isCompanion = (update.user.isCompanion === 1) ? true : (update.user.isCompanion === 0) ? false : update.user.isCompanion;
  })
  return updates;
}
