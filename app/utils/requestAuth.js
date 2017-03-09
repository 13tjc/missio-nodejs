var Session = require('../models/session');
var User = require('../models/user');

module.exports = function (app) {
  function isAuthorized (req, res, next) {
      console.log("isAuthorized");
    //next();
    //return;

    var authToken = req.headers['access-token'];

    if (!authToken) {
      return res.status(403).json({
        success: false,
        message: 'No Access-Token.'
      });
    }

    if (authToken === app.get('apikey') || authToken === app.get('cd2Key') || authToken === app.get('fuzatiKey')  ) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Invalid Access-Token.'
      });
    }

  }

  function isAdmin (req, res, next) {
      
    var authToken = req.headers['x-input-mask-token'];

    if (authToken && authToken === 'e3de98cdbc375ba9ad464435bfcf9b68') {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Invalid Access-Token.'
      });
    }

  }

  function isLoggedIn (req, cb) {
    cb = typeof cb == 'function' ? cb : function () {};

    if (req.isAuthenticated()) return cb(true);

    var authHeader = req.headers['authorization'];

    if (!authHeader) return cb(false);

    var token = authHeader.match(/(?:bearer.+?)?(.*)/i)[1];

    Session.findOne({
      where: {
        token: token
      }
    }).then(function (session) {
      if (session) {
        req.sessionID = token;
        User.findById(session.userId).then(function (user) {
          if (!user) return cb(false);

          req.user = user;
          session.save();
          cb(true);
        });
      } else {
        cb(false);
      }
    });
  }

  function loginReq (req, res, next) {
    isLoggedIn(req, function (authenticated) {
      if (authenticated) {
        return next();
      } else {
        return res.sendStatus(401);
      }
    });
  }

  function loginOpt (req, res, next) {
    isLoggedIn(req, function (authenticated) {
      return next();
    });
  }

  return {
    isAuthorized: isAuthorized,
    isAdmin: isAdmin,
    loginReq: loginReq,
    loginOpt: loginOpt
  };
}