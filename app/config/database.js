var database = require('../config/sequelize');
var async = require('async');
var fs = require('fs');

var Diocese = require('../models/diocese');
var Organization = require('../models/organization');
var User = require('../models/user');
var UserGeo = require('../models/userGeo');
var Billing = require('../models/billing');
var PushToken = require('../models/pushToken');
var Project = require('../models/project');
var Update = require('../models/update');
var Follow = require('../models/follow');
var ProjectCompanion = require('../models/projectCompanion');
var OrgUpdate = require('../models/organizationUpdate');
var OrgFollow = require('../models/organizationFollow');
var Session = require('../models/session');
var Give = require('../models/give');
var Share = require('../models/share');
var Act = require('../models/act');
var ActPreset = require('../models/actPreset');

var UserSupportView = require('../models/userSupportView');
var UserView = require('../models/userView');
var UserSeachView = require('../models/userSearchView');
var UserDetailView = require('../models/userDetailView');
var ProjectMetaView = require('../models/projectMetaView');
var ProjectView = require('../models/projectView');
var OrganizationSearchView = require('../models/organizationSearchView');

var SQL_STORED_PROCS = fs.readFileSync(__dirname + '/../sql/storedProcs.sql', 'utf8').trim();

function syncTable (model, callback) {
  model.sync().then(callback);
}

// Sync Tables
//async.each([Diocese, Organization, User, UserGeo, Billing, PushToken, Project, Update, Follow, ProjectCompanion, OrgUpdate, OrgFollow, Session, Give, Share, ActPreset, Act], syncTable, function (err) {
//
//  // Load Stored Procedures and Functions
//  database.query(SQL_STORED_PROCS).spread(function (results, metadata) {
//    
//    // Sync Views
//    async.each([UserSupportView, UserView, UserSeachView, UserDetailView, ProjectMetaView, ProjectView, OrganizationSearchView], syncTable, function (err) {
//      
//      ActPreset.findAll().then(function (presets) {
//        if (presets.length) return;
//
//        ActPreset.bulkCreate([{
//          actText: 'I will pray in support of this project.'
//        }, {
//          actText: 'I will light a candle in support of this project.'
//        }, {
//          actText: 'I will discuss this project with my friends.'
//        }])
//      })
//
//    })
//
//  })
//
//})

module.exports = database;