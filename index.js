// ToDo: log to file
// ToDo: set node v6 build
// ToDo: es6?

var conf = require('./app/config'), 
  port = process.env.PORT || conf.port,
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
      result.stream.pipe(res);  
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
  // if (process.env.ENV !== 'dev') { process.exit(1); }
})