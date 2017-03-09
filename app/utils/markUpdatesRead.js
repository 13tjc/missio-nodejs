var database = require('../config/database')
var debug = require('debug')('Missio:utils:markUpdatesRead')

var noop = function(){}

module.exports = function (userId, updates, callback) {
  var callback = callback || noop

  if (!userId) return callback()

  var projUpdates = updates.filter(function (obj) {
    return obj.source.type === 'project'
  })

  var orgUpdates = updates.filter(function (obj) {
    return obj.source.type === 'organization'
  })

  markProjUpdatesRead(userId, projUpdates, callback)
  markOrgUpdatesRead(userId, orgUpdates, callback)

}




/**
 * Private methods
 */

function markProjUpdatesRead (userId, updates, callback) {
  var callback = callback || noop
  var values = []

  values = updates.map(function (obj) {
    return '(' + [userId, obj.id].join(',') + ')'
  })

  if (!values.length) return callback()

  database.query('INSERT IGNORE INTO updates_read (user_id, updates_id) VALUES ' + values.join(','), 
  {raw: true}).spread(function (meta) {
    debug(meta)
    callback()
  })
}

function markOrgUpdatesRead (userId, updates, callback) {
  var callback = callback || noop
  var values = []

  values = updates.map(function (obj) {
    return '(' + [userId, obj.id].join(',') + ')'
  })

  if (!values.length) return callback()

  database.query('INSERT IGNORE INTO organization_updates_read (user_id, organization_updates_id) VALUES ' + values.join(','), 
  {raw: true}).spread(function (meta) {
    debug(meta)
    callback()
  })
}