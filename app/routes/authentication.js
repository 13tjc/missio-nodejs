var express = require('express');
var authRoutes = express.Router();

var database = require('../config/database');

var transporter = require('../config/sendmail');

var memcached = require('../config/memcached');

var User = require('../models/user');

module.exports = function (reqAuth, passport) {




  authRoutes.post('/register', reqAuth.isAuthorized, function (req, res, next) {
    if (!(req.body.firstName && req.body.lastName && req.body.email && req.body.password)) {
      return res.status(400).json({ success: false, message: 'Missing parameters.' });
    }

    passport.authenticate('local-signup', function (err, user, info) {
      if (err) {
        return next(err);
      }
      if (!user) {
        
        return res.json(info);
      }
      req.logIn(user, function (err) {
        if (err) {

          return next(err);
        }
        //res.status(201).json({ success: true, data: { user_id: user.id, token: req.sessionID } });
        res.status(201).json({ success: true, data: { user_id: user.id, token: req.sessionID, hash: user.password, fundraiser: user.fundraiser,  first_name: user.firstName  } }); // THOMAS RADEMAKER : ADDED HASHED PASSWORDS
      });

    })(req, res, next);
  });

  authRoutes.post('/login', reqAuth.isAuthorized, function (req, res, next) {
    //res.json({"success":false});
    //return;
    console.log("testing login");
    passport.authenticate('local-login', function (err, user, info) {
      console.log("testing login response");
      if (err) {
        return next(err);
      }
      if (!user) {
        console.log("!user")
        return res.json(info);
      }
      req.logIn(user, function (err) {
        if (err) {
          console.log("!err")
          return next(err);
        }
        //res.json({ success: true, data: { user_id: user.id, token: req.sessionID } });
       // res.json({ success: true, data: { user_id: user.id, token: req.sessionID, hash: user.password } }); // THOMAS RADEMAKER : ADDED HASHED PASSWORDS
         res.json({ success: true, data: { user_id: user.id, token: req.sessionID, hash: user.password, first_name: user.firstName, fundraiser: user.fundraiser } });
      });

    })(req, res, next);
  });

  authRoutes.post('/login/facebook', reqAuth.isAuthorized, function (req, res, next) {
    passport.authenticate('facebook-token', function (err, user, info) {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.json(info);
      }
      req.logIn(user, function (err) {
        if (err) {
          return next(err);
        }
        res.json({ success: true, data: { user_id: user.id, token: req.sessionID } });
      });
    })(req, res, next);
  });

  authRoutes.post('/login/twitter', reqAuth.isAuthorized, function (req, res, next) {

    setTimeout(function () {
      return res.json({ success: false, message: 'Error connecting to Twitter, please try again later.' });
    }, 250)


    // passport.authenticate('twitter-token', function (err, user, info) {
    //   if (err) {
    //     return next(err);
    //   }
    //   if (!user) {
    //     return res.json(info);
    //   }
    //   req.logIn(user, function (err) {
    //     if (err) {
    //       return next(err);
    //     }
    //     res.json({ success: true, data: { user_id: user.id, token: req.sessionID } });
    //   });
    // })(req, res, next);
  });

  authRoutes.post('/login/google', reqAuth.isAuthorized, function (req, res, next) {
    passport.authenticate('google-token', function (err, user, info) {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.json(info);
      }
      req.logIn(user, function (err) {
        if (err) {
          return next(err);
        }
        res.json({ success: true, data: { user_id: user.id, token: req.sessionID } });
      });
    })(req, res, next);
  });

  authRoutes.post('/forgot', reqAuth.isAuthorized, function (req, res, next) {
    User.findOne({
      where: {
        email: req.body.email
      }
    }).then(function (user) {
      if (!user) res.json({ success: false, message: 'User does not exist.' });

      database.query("CALL FORGOT_PASSWORD(:email);", 
      {
        replacements: {
          email: user.email
        }
      }).spread(function (result) {
        transporter.sendMail({
          from: 'no-reply@missio.org',
          to: user.email,
          subject: 'Missio Password Reset',
          template: 'forgot_pwd_email',
          context: {user: user, url: 'https://missio.org' + '/forgot/' + result.token}//'https://' + req.headers.host + '/forgot/' + result.token}
        }, function (err, info) {
          if (err) return res.json({ success: false, message: err });
          res.json({ success: true, message: 'Email sent.' });
        });
      });

    }).catch(function (err) {
      console.error('Error in:\n\tForgot password for email: %s\n', req.body.email)
      console.error(err)
    });;
  });

  authRoutes.get('/logout', reqAuth.loginReq, function (req, res, next) {
    req.logOut();
    req.session.req.sessionStore.destroy(req.sessionID, function (err) {
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });

  return authRoutes;
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + s4() + s4();
}
