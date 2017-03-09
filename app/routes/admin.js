var express = require('express');
var adminRoutes = express.Router();

var inputMask = require('../utils/inputMask');

var fs = require('fs');
var util = require('util');
var path = require('path');
var appDir = path.dirname(require.main.filename);
var adminPath = path.join(appDir, 'admin');

var User = require('../models/user');

module.exports = function (reqAuth) {

  adminRoutes.get('/users', reqAuth.isAdmin, function (req, res, next) {
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
    
    User.findAll({
      where: whereObj,
      order: order,
      limit: req.query.limit || 0,
      offset: req.query.offset || 0
    }).then(function (users) {
      if (!users) return res.json({ success: false, message: 'Server Error.'});
      if (!users.length) return res.json({ success: true, data: [], message: 'No Users found.'});

      res.json({ success: true, data: users });
    })
  })

  adminRoutes.get('/users/:id', reqAuth.isAdmin, function (req, res, next) {
    if (isNaN(req.params.id)) return res.json({ success: false, message: 'Invalid user id.'});
    User.findById(req.params.id).then(function (users) {
      if (!users) return res.json({ success: false, message: 'Server Error.'});

      res.json({ success: true, data: users });
    })
  })

  adminRoutes.post('/users/:id', reqAuth.isAdmin, function (req, res, next) {
    if (isNaN(req.params.id)) return res.json({ success: false, message: 'Invalid user id.'});
    User.findOne({
      where: {
        id: req.params.id
      }
    }).then(function (user) {
      if (!user) return res.json({ success: true, message: 'No user for id.' });

      var protectedFields = ['id', 'password', 'facebookId', 'twitterId', 'googlePlusId', 'nsId', 'createdAt', 'updatedAt']

      for (var i = 0; i < protectedFields.length; i++) {
        delete req.body[protectedFields[i]]
      };

      user.update(req.body).then(function (user) {
        if (!user) return res.json({ success: false, message: 'Server error.'});
        res.json({ success: true, data: { user: user } });
      }).catch(function (err) {
        res.json({ success: false, message: err.message});
      });

    })
  })

  // adminRoutes.get('/', function (req, res, next) {
  //   res.sendFile(path.join(adminPath, 'index.html'))
  // })

  // adminRoutes.get('/pullDioceseEvents', function (req, res, next) {
  //   req.socket.setKeepAlive(true);
  //   req.socket.setTimeout(0);

  //   res.header({
  //     'Content-Type': 'text/event-stream;charset=UTF-8',
  //     'Cache-control': 'no-cache',
  //     'Connection': 'keep-alive'
  //   });

  //   res.status(200);

  //   inputMask.getDioceses(res);
  // })


  // adminRoutes.get('/pullOrgEvents/:id?', function (req, res, next) {
  //   req.socket.setKeepAlive(true);
  //   req.socket.setTimeout(0);

  //   res.header({
  //     'Content-Type': 'text/event-stream;charset=UTF-8',
  //     'Cache-control': 'no-cache',
  //     'Connection': 'keep-alive'
  //   });

  //   res.status(200);

  //   inputMask.getOrganizations(req.params.id, res);
  // })


  return adminRoutes;

}