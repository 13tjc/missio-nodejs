var apn = require('apn');
var gcm = require('node-gcm')
var PushToken = require('../models/pushToken');
var async = require('async');

var database = require('../config/database');

var options = {
  pfx: __dirname +  '/../certs/Missio_Production_APNS.p12',
  passphrase: 'missio',
  production: true,
  batchFeedback: true,
  interval: 300
};

if (process.env.DEBUG) {
  options = {
    pfx: __dirname +  '/../certs/Missio_Sandbox_APNS.p12',
    passphrase: 'missio',
    production: false,
    batchFeedback: true,
    interval: 300
  }
}

var apnConnection = new apn.Connection(options);  //THOMAS 
var gcmConnection = new gcm.Sender('AIzaSyCPSDL-RgqY-11zu1b4yULzQGo2iH8GcV8');

function PushNotify () {
  
}

PushNotify.prototype.send = function (userId, messageObj) {
  var whereObj = {};
  if (userId !== '*') whereObj.userId = userId

  PushToken.findAll({
    where: whereObj
  }).then(function (userTokens) {
    database.query('SELECT (IFNULL(pu.updates, 0) + IFNULL(ou.updates, 0) + IFNULL(um.unread, 0)) `total` FROM `view_unread_updates` pu left join `view_unread_organization_updates` ou on (pu.userId = ou.userId) left join `view_unread_messages` um on (um.userId = pu.userId) WHERE `pu`.`userId` = :userId GROUP BY `total`;', 
    {
      replacements: {
        userId: whereObj.userId ? whereObj.userId : -1
      },
      raw: true,
      nest: true
    }).then(function (unread) {
      if (unread && unread[0]) messageObj.unread =  unread[0].total;
      async.each(userTokens, sendPushWithObj(messageObj));
    })
  })
};

module.exports = new PushNotify();

function sendPushWithObj (messageObj) {
  return function (tokenObj, callback) {
    sendPushNotification(tokenObj, messageObj, callback);
  }
}

function sendPushNotification (tokenObj, messageObj, callback) {
  if (!messageObj) return callback();

  if (tokenObj.type === 'apn') {
    var device = new apn.Device(tokenObj.token);

    var note = new apn.Notification();

    if (messageObj.unread) note.badge = messageObj.unread;
    note.sound = "ping.aiff";
    note.alert = { title: messageObj.title, body: messageObj.body };
    if (messageObj.payload) note.payload = messageObj.payload;

    apnConnection.pushNotification(note, device);
  } 

  if (tokenObj.type === 'gcm') {
    var device = [tokenObj.token];

    var message = new gcm.Message();

    message.addData('title', messageObj.title)
    message.addData('body', messageObj.body)
    if (messageObj.unread) message.addData('unread', messageObj.unread)
    if (messageObj.payload) {
      for (key in messageObj.payload) {
        message.addData(key, messageObj.payload[key])
      }
      
    }

    gcmConnection.sendNoRetry(message, device, function(err, result) {
    });
  }

  callback();
}

var feedback = new apn.Feedback(options);
feedback.on("feedback", function(devices) {
    devices.forEach(function(item) {
        // Do something with item.device and item.time;
        // console.log(item, item.device.token.toString('utf8'))
    });
}); 

function sendQueuedMessages () {
  database.query('SELECT * FROM `push_notification_queue` WHERE `sendDate` < NOW() AND `sent` = false;', 
  {
    raw: true,
    nest: true
  }).then(function (messages) {

    function sendMessage (message, cb) {
      module.exports.send(message.userId ? message.userId : '*', message)

      database.query('UPDATE `push_notification_queue` SET `sent` = true WHERE `id` = :messageId;', 
      {
        replacements: {
          messageId: message.id
        }
      }).then(function (messages) {
        cb()
      })

    }

    async.each(messages, sendMessage);

  })
}

setInterval(sendQueuedMessages, 10 * 1000)


