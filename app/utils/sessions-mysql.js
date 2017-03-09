var Sequelize = require('sequelize');
var database = require('../config/database');

var Session = require('../models/session');

var noop = function(){};

module.exports = function (session) {
  var self = this;
  
  var Store = session.Store;

  function MySQLStore (options) {
    var self = this;

    options = options || {};
    Store.call(this, options);
    this.prefix = options.prefix == null ? 'sess:' : options.prefix;

    this.client = database;

  }

  MySQLStore.prototype.__proto__ = Store.prototype;

  MySQLStore.prototype.get = function (sid, fn) {
    var store = this;
    var psid = store.prefix + sid;
    if (!fn) fn = noop;

    Session.findOne({
      where: {
        sessionId: psid
      }
    }).then(function (session) {
      if (!session) return fn();
      return fn(null, JSON.parse(session.sessionObj));
    });
  }

  MySQLStore.prototype.set = function (sid, sess, fn) {
    var store = this;
    var psid = store.prefix + sid;
    if (!fn) fn = noop;

    if (!sess.passport || !sess.passport.user) return fn(null, sess);

    Session.upsert({
      sessionId: psid,
      sessionObj: JSON.stringify(sess),
      token: sid,
      userId: sess.passport.user
    }).then(function (session) {
      fn(null, sess);
    });
    return;
  }

  MySQLStore.prototype.destroy = function (sid, fn) {
    var store = this;
    var psid = store.prefix + sid;
    Session.destroy({
      where: {
        sessionId: psid
      }
    }).then(function (count) {
      // console.log(count + ' sessions deleted');
      return fn();
    });
  }

  return MySQLStore;
}