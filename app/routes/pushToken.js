var express = require('express');
var pushTokenRoutes = express.Router();

var PushToken = require('../models/pushToken');

module.exports = function (reqAuth) {

  pushTokenRoutes.post('/', reqAuth.loginReq, function (req, res) {
    if (!(req.body.type && req.body.token)) return res.status(400).json({ success: false, message: 'Missing parameters.' });

    PushToken.findOrCreate({
      where: {
        token: req.body.token
      },
      defaults: {
        userId: req.user.id,
        type: req.body.type,
        token: req.body.token
      }
    }).then(function (pushtoken, created) {
      res.json({ success: true });
    }).catch(function (err) {
      res.json({ success: false, message: err.message});
    });

  });

  pushTokenRoutes.delete('/:token', reqAuth.loginReq, function (req, res) {

    PushToken.destroy({
      where: {
        token: req.params.token
      }
    }).then(function (deleted) {
      res.json({ success: true });
    }).catch(function (err) {
      res.json({ success: false, message: err.message});
    });
  });

  return pushTokenRoutes;

}