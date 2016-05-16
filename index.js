// ToDo: log to file
// ToDo: set node v6 build
// ToDo: es6?

var conf = require('./app/config'), 
  port = process.env.PORT || conf.port,
  http = require('http'),
  fs = require('fs'),
  proxy = require('./app/proxy')
  httpProxy = require('http-proxy');

var util = require('util');


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
  console.log('aaa',conf.storage);
  switch(conf.storage) {
    case 'file':
      proxy.init();
      console.log('started in Storage mode');
      proxy.process(req, proxyResponseWrapper(res));  
      break;
    
    case 'none':
    default:
      console.log('started in CleanProxy mode');
      var options = {
        secure: false
      };
      var cleanProxy = httpProxy.createProxyServer(options);
      cleanProxy.web(req, res, { target: 'https://thoughtbot.com' });
      
      // proxy.on('error', function(e) {
      //   ...
      // });
  }
    
}).listen(port);
console.log('Server running at http://127.0.0.1:' + port);

process.on('uncaughtException', function (err) {
  console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
  console.error(err.stack);  
  // if (process.env.ENV !== 'dev') { process.exit(1); }
})