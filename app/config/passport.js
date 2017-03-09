var passport = require('passport');

var LocalStrategy = require('passport-local').Strategy;
var FacebookTokenStrategy = require('passport-facebook-token').Strategy;
var TwitterTokenStrategy = require('passport-twitter-token').Strategy;
var GoogleTokenStrategy = require('passport-google-token').Strategy;

var User = require('../models/user');

  
  passport.serializeUser(function (user, done) {

    done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    User.findById(id).then(function (user) {
      done(null, user);
    });
  });

  passport.use('local-signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  },
  function (req, email, password, done) {

    User.findOne({
      where: {
        email: email
      }
    }).then(function (user) {
      if (user) {
        return done(null, false, { success: false, message: 'Email in use.'});
      }

      var userObj = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password,
        fundraiser: req.body.fundraiser, // THOMAS RADEMAEKR : UPDATE_USER
        leadSource: req.body.leadSource
      };




      var authToken = req.headers['x-input-mask-token'];

      if (authToken && authToken === 'e3de98cdbc375ba9ad464435bfcf9b68') {
        userObj.city = req.body.city;
        userObj.state = req.body.state;
        userObj.zip = req.body.zip;
        userObj.organizationId = req.body.organizationId;
        userObj.image = req.body.image;
        userObj.leader = req.body.leader;
        userObj.companion = req.body.companion;
        userObj.admin = req.body.admin;

        if (req.body.country && req.body.country.length === 2) {
          userObj.country = req.body.country;
        };
      }


      user = User.build(userObj)

      user.setPassword(password, function(err, user) {
        if (err) return done(null, false, { success: false, message: err });
        
        return done(null, user);
      });


    });
  }));

  passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  },
  function (req, email, password, done) {

    User.findOne({
      where: {
        email: email
      }
    }).then(function (user) {
      if (!user) {
        return done(null, false, { success: false, message: 'Invalid email/password.'});
      }

      user.verifyPassword(password, function (err, res) {
        if (err) {
          return done(null, false, { success: false, message: 'Invalid email/password.'});
        }

        if (!res) {
          return done(null, false, { success: false, message: 'Invalid email/password.'});
        }

        return done(null, user);
      });
    });
  }));

  passport.use(new TwitterTokenStrategy({
      consumerKey: 'M2kFhMQgdDnD6tH0PUv3jzaot',
      consumerSecret: 'FCx95IkhyTVMbIgMQGPojl7RN9X6WI7GQV3bRMhd1yNvVK5hZe'
    },
    function(token, tokenSecret, profile, done) {
      profileId = String(profile.id);
      User.findOne({
        where: {
          twitterId: profileId
        }
      }).then(function (user) {
        if (user) return done(null, user);

        if (!profile.emails[0].value) return done(null, false, { success: false, message: 'Email address required to create account.'});

        User.findOne({
          where: {
            email: profile.emails[0].value
          }
        }).then(function (user) {
          if (user) {
            user.update({
              twitterId: profileId,
              image: user.image || profile.photos[0].value
            }).then(function (user) {
              if (!user) return done(null, false, { success: false, message: 'Error associating with account with same email.'});
              return done(null, user);
            }).catch(function (err) {
              return done(null, false, { success: false, message: err.message});
            });
          } else {
            User.create({
              email: profile.emails[0].value,
              image: profile.photos ? profile.photos[0].value : '',
              twitterId: profileId
            }).then(function (user) {
              if (!user) return done(null, false, { success: false, message: 'Error creating account'});
              return done(null, user);
            }).catch(function (err) {
              return done(null, false, { success: false, message: err.message});
            });
          }
        });
      });
    }
  ));

  passport.use(new FacebookTokenStrategy({
      clientID: '649566621809881',
      clientSecret: 'b1602463c644e95852a5dfa2556f7852'
    },
    function(accessToken, refreshToken, profile, done) {

      User.findOne({
        where: {
          facebookId: profile.id
        }
      }).then(function (user) {
        if (user) return done(null, user);

        if (!profile.emails[0].value) return done(null, false, { success: false, message: 'Email address required to create account.'});

        User.findOne({
          where: {
            email: profile.emails[0].value
          }
        }).then(function (user) {
          if (user) {
            var shouldFillName = !user.firstName && !user.lastName;
            user.update({
              firstName: shouldFillName ? profile.name.givenName : user.firstName,
              lastName: shouldFillName ? profile.name.familyName : user.lastName,
              facebookId: profile.id,
              image: user.image || profile.photos[0].value
            }).then(function (user) {
              if (!user) return done(null, false, { success: false, message: 'Error associating with account with same email.'});
              return done(null, user);
            }).catch(function (err) {
              return done(null, false, { success: false, message: err.message});
            });
          } else {
            User.create({
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              email: profile.emails[0].value,
              image: profile.photos ? profile.photos[0].value : '',
              facebookId: profile.id
            }).then(function (user) {
              if (!user) return done(null, false, { success: false, message: 'Error creating account'});
              return done(null, user);
            }).catch(function (err) {
              return done(null, false, { success: false, message: err.message});
            });
          }
        });
      });
    }
  ));

  passport.use(new GoogleTokenStrategy({
      clientID: '35384006621-uifhef9pc5vemjts54eumcak8mvt4ljn.apps.googleusercontent.com',
      clientSecret: 'dHyr8uf3TI0Czau30TGdSLCa'
    },
    function(accessToken, refreshToken, profile, done) {

      User.findOne({
        where: {
          googlePlusId: profile.id
        }
      }).then(function (user) {
        if (user) return done(null, user);

        if (!profile.emails[0].value) return done(null, false, { success: false, message: 'Email address required to create account.'});

        User.findOne({
          where: {
            email: profile.emails[0].value
          }
        }).then(function (user) {
          if (user) {
            user.update({
              googlePlusId: profile.id,
              image: user.image || profile.photos[0].value
            }).then(function (user) {
              if (!user) return done(null, false, { success: false, message: 'Error associating with account with same email.'});
              return done(null, user);
            }).catch(function (err) {
              return done(null, false, { success: false, message: err.message});
            });
          } else {
            User.create({
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              email: profile.emails[0].value,
              image: profile.photos ? profile.photos[0].value : '',
              googlePlusId: profile.id
            }).then(function (user) {
              if (!user) return done(null, false, { success: false, message: 'Error creating account'});
              return done(null, user);
            }).catch(function (err) {
              return done(null, false, { success: false, message: err.message});
            });
          }
        });
      });
    }
  ));

module.exports = passport