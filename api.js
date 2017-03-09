// Globals
var PORT = process.env.PORT || 8010;

if (process.env.NEW_RELIC_LICENSE_KEY) require('newrelic');

var database = require('./app/config/database');

var express = require('express');
var passport = require('./app/config/passport');
var app = require('./app/config/server')(passport);

var reqAuth = require('./app/utils/requestAuth')(app);

var apiRoutes = express.Router();
var adminRoutes = require('./app/routes/admin')(reqAuth);
var publicRoutes = require('./app/routes/public')(reqAuth);
var authRoutes = require('./app/routes/authentication')(reqAuth, passport);
var userRoutes = require('./app/routes/user')(reqAuth);
var updateRoutes = require('./app/routes/update')(reqAuth);
var pushTokenRoutes = require('./app/routes/pushToken')(reqAuth);
var projRoutes = require('./app/routes/project')(reqAuth);
var orgRoutes = require('./app/routes/organization')(reqAuth);
var tickerRoutes = require('./app/routes/ticker')(reqAuth);
var newsRoutes = require('./app/routes/news')(reqAuth);
var popeMsgRoutes = require('./app/routes/popeMsg')(reqAuth);

apiRoutes.use('/admin', adminRoutes);

var pushNotify = require('./app/utils/pushNotify');
apiRoutes.post('/notify', reqAuth.isAuthorized, function (req, res) {
  var title = req.body.data && req.body.data.title ? req.body.data.title : ''
  var body = req.body.data && req.body.data.body ? req.body.data.body : ''

  pushNotify.send(+req.body.to, {title: title, body: body, unread: +req.body.unread})
  res.sendStatus(200);
})



apiRoutes.use('/', authRoutes);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/updates', updateRoutes);
apiRoutes.use('/pushtoken', pushTokenRoutes);
apiRoutes.use('/projects', projRoutes);
apiRoutes.use('/organizations', orgRoutes);
apiRoutes.use('/ticker', tickerRoutes);
apiRoutes.use('/news', newsRoutes);
apiRoutes.use('/popemessage', popeMsgRoutes);


app.use('/api', apiRoutes);

app.use('/', publicRoutes);


/*

app.all('/api/login',function(req,res)
{
	var data = req.headers;
	data.route = req.route;

	
	res.json(req.headers)
})

*/

app.listen(PORT);
