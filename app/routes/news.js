var express = require('express');
var newsRoutes = express.Router();

var vaticanNews = require('../utils/vaticanNews.js');
var memcached = require('../config/memcached');

var noop = function(){};

module.exports = function (reqAuth) {

  newsRoutes.get('/vatican', function (req, res, next) {

    memcached.get('missio-vatican-news', function (err, data) {
      if (err) return res.json({ success: false, message: err });
      if (data) return res.json({ success: true, data: data });

      vaticanNews(function (err, feed) {
        if (err) return res.json({ success: false, message: err });

        // cache feed for 10 minutes
        memcached.set('missio-vatican-news', feed, 600, noop);

        res.json({ success: true, data: feed });
      });

    });

    

  });

  return newsRoutes;

}
