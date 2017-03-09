var moment = require('moment');
var request = require('superagent');
var parseString = require('xml2js').parseString;
var cheerio = require('cheerio');

module.exports = function (cb) {
  cb = cb || function () {};

  request.get('http://www.news.va/en/rss.xml')
    .buffer()
    .end(function (err, response) {
      if (err) return cb(err);
      if (!response.text) return cb('News server responded with null string.');

      parseString(response.text, function (err, result) {
        var feed = [];
        var entries = result.feed.entry;

        for (var i = 0; i < entries.length; i++) {
          var newsItem = {};
          var $ = cheerio.load(entries[i].content[0]._.trim());
          var imgLink = $('img').attr('src');
          $('img').remove();

          newsItem.title = entries[i].title[0].trim();
          newsItem.url = entries[i].id[0].trim();
          newsItem.images = typeof imgLink === 'array' ? imgLink : imgLink ? [imgLink] : [];
          newsItem.html = $.html().trim();
          newsItem.text = entries[i].summary[0]._.trim().replace(/\.\.\.$/i, '');
          newsItem.updated = new Date(entries[i].updated[0].trim());
          newsItem.updatedAgo = moment(entries[i].updated[0].trim()).fromNow();

          feed.push(newsItem);
        }

        cb(null, feed);
      });
    });
}