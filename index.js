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
var proxy = require('./app/proxy')

var util = require('util');

// http.get(function(res) {
//   res.on('data', function(chunk) {
//     console.log(res.headers);
//   });
// }).end();

proxy.init();

function proxyResponseWrapper(res) {
  return function proxyResponse(result) {
    if (result.error) {
        // only 404 in the moment
      res.writeHead(404);
      res.end(); 
    } else {
      res.writeHead(200, {'Content-Type': 'text/plain'});    
      res.end( result.data );  
    }    
  }
}


http.createServer(function (req, res) {
    proxy.process(req, proxyResponseWrapper(res));    
}).listen(port);
console.log('Server running at http://127.0.0.1:' + port);