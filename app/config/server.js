var express = require('express');
var app = express();

var FILE_SIZE_LIMIT = 100 * 1024 * 1024;

var exphbs  = require('express-handlebars');

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MySQLStore = require('../utils/sessions-mysql')(session);

var multer = require('multer');
var fs = require('fs');
var sharp = require('sharp');
var path = require('path');
var appDir = '/var/www/html/';//path.dirname(require.main.filename); // THOMAS RADEMAKER
var mediaPath = path.join(appDir, '_media');
var publicPath = path.join(appDir, 'web');
var multerSharpFileStorage = require('../utils/multerSharpFileStorage')({ destination: mediaPath });

var upload = multer({
      storage: multerSharpFileStorage,
      limits: {
        files: 1,
        fileSize: FILE_SIZE_LIMIT
      },
      putSingleFilesInArray: true,
      onFileSizeLimit: function (file) {
        // delete the partially written file
        fs.unlink(path.join(appDir, file.path));
      }
    }).fields([{ name: 'image', maxCount: 1 }, { name: 'file', maxCount: 1 }]);

module.exports = function (passport) {
  
  app.set('missioSecret', 'resolute');
  app.set('apikey', 'CWku8OjaTFPWSq0w');
  app.set('cd2Key', 'af3d0e61bababb1bdc2035541b355730');
  app.set('fuzatiKey', '83c06ac960f9deabcb7f8c8aefff1ad8');

  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  app.use(function (req, res, next) {
    upload(req, res, function (err) {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: "Unrecognized field name. Upload field names should be 'image' or 'file'."});
      }
      return next();
    })
  });

  app.engine('.hbs', exphbs({defaultLayout: 'main', extname: '.hbs'}));
  app.set('view engine', '.hbs');

  app.use("/media", express.static(mediaPath));
  app.use("/", express.static(publicPath));

  app.use(session({
    secret: 'missioSecret',
    resave: false,
    saveUninitialized: false,
    store: new MySQLStore({})
  }));

  app.use(passport.initialize());
  app.use(passport.session());
  
  return app;

}