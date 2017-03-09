var Sequelize = require('sequelize');
var sequelize = require('../config/sequelize');

var Organization = require('./organization');

var User = sequelize.define('user', {
  firstName: {
    type: Sequelize.STRING,
    set: function (name) {
      this.setDataValue('firstName', name);
      this.setDataValue('fullName', name + ' ' + this.getDataValue('lastName'));
    }
  },
  lastName: {
    type: Sequelize.STRING,
    set: function (name) {
      this.setDataValue('lastName', name);
      this.setDataValue('fullName', this.getDataValue('firstName') + ' ' + name);
    }
  },
  fullName: Sequelize.STRING,
  email: {
    type: Sequelize.STRING,
    unique: true,
    validate: {
      isEmail: { msg: 'Invalid email.' }
    }
  },
  password: Sequelize.STRING,
  city: Sequelize.STRING,
  state: Sequelize.STRING,
  zip: Sequelize.STRING,
  country: {
    type: Sequelize.STRING(2),
    validate: {
      len: { 
        args: [2, 2],
        msg: 'Invalid country code. Must be 2 characters.' 
      }
    }
  },
  isCatholic: {
    type: Sequelize.ENUM,
    values: ['N/A', 'Yes', 'No'],
    defaultValue: 'N/A',
    allowNull: false
  },
  organizationId: Sequelize.INTEGER,
  image: Sequelize.STRING,
  facebookId: {
    type: Sequelize.STRING,
    unique: true
  },
  twitterId: {
    type: Sequelize.STRING,
    unique: true
  },
  googlePlusId: {
    type: Sequelize.STRING,
    unique: true
  },
  nsId: Sequelize.INTEGER,
  leader: Sequelize.BOOLEAN,
  fundraiser: Sequelize.BOOLEAN, // THOMAS RADEMAKER : UPDATE_USER
  leadSource: Sequelize.STRING, // THOMAS RADEMAKER : UPDATE_USER
  companion: Sequelize.BOOLEAN,
  admin: Sequelize.BOOLEAN
}, {
  instanceMethods: {
    setPassword: function (password, done) {
      // if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) return done('Password must be at least 8 characters and have at least 1 letter and 1 number.', this);

      this.save().then(function (user) {
        sequelize.query("CALL SET_USER_PASSWORD(:id, :password);", 
        {
          replacements: {
            id: user.id,
            password: password
          }
        }).spread(function (result) {
          return done(null, user);
        });
      })
    },
    verifyPassword: function (password, done) {
      sequelize.query("CALL LOGIN(:email, :password);", 
      {
        replacements: {
          email: this.email,
          password: password
        }
      }).spread(function (result) {
        return done(null, !!result);
      });
    },
    toJSON: function () {
      var obj = this.get({
        plain: true
      });
      delete obj.password;
      return obj;
    }
  }
});

User.belongsTo(Organization);

module.exports = User;