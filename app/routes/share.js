var express = require('express');
var shareRoutes = express.Router();

var util = require( "util" );
var async = require('async');
var transporter = require('../config/sendmail');
var NetSuite = require('../utils/netsuite');

var Share = require('../models/share');
var Update = require('../models/update');
var ProjectView = require('../models/projectView');
var Project = require('../models/project');

module.exports = function (reqAuth) {

  shareRoutes.post('/:id/share', reqAuth.loginReq, function (req, res, next) {
    if (!req.body.platform) return res.status(400).json({ success: false, message: 'Missing parameters.' });

    var sharedToCount = req.body.sharedToCount;
    var emails, emailSendErr;

    if (req.body.platform === 'email') {
      if (!req.body.emails) return res.status(400).json({ success: false, message: 'Missing parameters. emails' });
      emails = req.body.emails.split(',');

      for (var i = 0; i < emails.length; i++) {
        emails[i] = emails[i].trim();
      }
      sharedToCount = emails.length;
      emails = emails.join(',')

      ProjectView.findById(req.params.id).then(function (project) {

        var shareObj = {
          projectImage: project.featured_image_url,
          email: emails,
          projectTitle: project.project_name,
          senderFirstName: req.user.firstName,
          senderLastName: req.user.lastName,
          path: 'projects/' + project.id
        }

        NetSuite.shareProject(shareObj, function (err, info) {

          if (err) return res.json({ success: false, message: err.message });
          
          Share.create({
            projectId: req.params.id,
            userId: req.user.id,
            platform: req.body.platform,
            sharedToCount: sharedToCount,
            emailAddresses: emails
          }).then(function (share) {
            if (!share) return res.json({ success: false, message: 'Server error.'});

        
            Update.create({
              projectId: req.params.id,
              message: util.format('%s shared.', req.user.firstName),
              mediaType: null,
              mediaUrl: null,
              userId: req.user.id,
              type: 'share'
            }).then(function (update) {
              if (!update) return res.json({ success: false, message: 'Server error.'});
              followProject(req.params.id, req.user.id)
              return res.json({ success: true });
            });
            
            
          }).catch(function (err) {
            res.json({ success: false, message: err.message});
          });
        });

      })

    } else {
      Share.create({
        projectId: req.params.id,
        userId: req.user.id,
        platform: req.body.platform,
        sharedToCount: sharedToCount,
        emailAddresses: emails
      }).then(function (share) {
        if (!share) return res.json({ success: false, message: 'Server error.'});
		
			Update.create({
			  projectId: req.params.id,
			  message: util.format('%s shared.', req.user.firstName),
			  mediaType: null,
			  mediaUrl: null,
			  userId: req.user.id,
        type: 'share'
			}).then(function (update) {
			  if (!update) return res.json({ success: false, message: 'Server error.'});
			  followProject(req.params.id, req.user.id)
			  return res.json({ success: true });
			});
          
          
//        res.json({ success: true });
      }).catch(function (err) {
        res.json({ success: false, message: err.message});
      });
    }
  })

  return shareRoutes;

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
