// var express = require('express');
// var app = express();

// app.set('port', (process.env.PORT || 5000));

// app.use(express.static(__dirname + '/public'));

// views is directory for all template files
// app.set('views', __dirname + '/views');
// app.set('view engine', 'ejs');

// app.get('/', function(request, response) {
//   response.render('pages/index');
// });

// app.listen(app.get('port'), function() {
//   console.log('Node app is running on port', app.get('port'));
// });


var port = process.env.PORT || 5000;
var http = require('http');

var util = require('util');

// http.get(function(res) {
//   res.on('data', function(chunk) {
//     console.log(res.headers);
//   });
// }).end();

var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    var content = [];
    content.push(`=== Welcome aboard! ===`);
    content.push(`host ${req.headers.host}`);
    content.push(`path ${req.url}`);
    res.end( content.join('\n') );
    // res.end('Hello from app1!\n' + util.inspect(req));
}).listen(port, "127.0.0.1");
console.log('Server running at http://127.0.0.1:' + port);