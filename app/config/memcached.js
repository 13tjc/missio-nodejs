
var Memcached = require('memcached');

module.exports = new Memcached('mmc');
// var Memcached = require('memcached');

 module.exports = new Memcached('localhost:11211');


 var memCach = new Memcached('mmc');




memCach.get('missio-get-projects', function (err, data) {
console.log("errr");
console.log(err);
if(data)
{
	console.log("data");
	console.log(data.length);
}


	});