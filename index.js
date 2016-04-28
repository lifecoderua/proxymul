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


var port = process.env.PORT || 5000,
  http = require('http'),
  fs = require('fs'),
  proxy = require('./app/proxy')

var util = require('util');


proxy.init();

function proxyResponseWrapper(res) {
  return function proxyResponse(result) {
    if (result.error) {
      res.writeHead(result.error);
      res.end(); 
    } else {
      res.writeHead(200, {'Content-Type': result.contentType});    
      var readStream = fs.createReadStream(result.path);      
      readStream.pipe(res);  
    }    
  }
}


http.createServer(function (req, res) {
  proxy.process(req, proxyResponseWrapper(res));  
}).listen(port);
console.log('Server running at http://127.0.0.1:' + port);

process.on('uncaughtException', function (err) {
  console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
  console.error(err.stack);  
  if (process.env.ENV !== 'dev') { process.exit(1); }
})