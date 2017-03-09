var express = require('express');
var actRoutes = express.Router();

var util = require( "util" );

var Act = require('../models/act');
var ActPreset = require('../models/actPreset');
var Update = require('../models/update');
var Project = require('../models/project');

module.exports = function (reqAuth) {

  actRoutes.get('/:id/actpresets', function (req, res, next) {

    ActPreset.findAll().then(function (presets) {
      res.json({ success: true, data: presets });
    })
  })

  actRoutes.post('/:id/act', reqAuth.loginReq, function (req, res, next) {
    if (!req.body.actPreset && !req.body.otherActText) return res.status(400).json({ success: false, message: 'Missing parameters.' });

    var actPresetNumber = req.body.actPreset || undefined

    Act.create({
      projectId: req.params.id,
      userId: req.user.id,
      actPresetId: actPresetNumber,
      otherActText: actPresetNumber ? undefined : req.body.otherActText,
      followUp: req.body.followUp
    }).then(function (act) {
      if (!act) return res.json({ success: false, message: 'Server error.'});

      var presetId = isNaN(+req.body.actPreset) ? 0 : +req.body.actPreset

      ActPreset.findById(presetId).then(function (preset) {

        var actPresetText = preset ? preset.actText : req.body.otherActText;

        actPresetText = actPresetText.replace(/([I]?.*?will)/i, req.user.firstName + ' will')

        Update.create({
          projectId: req.params.id,
          message: actPresetText,
          userId: req.user.id,
          type: 'act'
        }).then(function (update) {
          if (!update) return res.json({ success: false, message: 'Server error.'});

          followProject(req.params.id, req.user.id)

          return res.json({ success: true });
        });

      })


    }).catch(function (err) {
      res.json({ success: false, message: err.message});
    });
  })

  return actRoutes;

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
