/*
 * Core ProxyMul
 * 
 * Proxy files from multiple mapped domains.
 * Mapping:Hash { requestDomain1: proxyDomain1, ... }
 * Entry data: [sub.]domain.dot.com[:port] 
 * Output data: guessed content-type header + file
 *  
 */

// ToDo: prepend storage path with the domain
// ToDo: floating issue with folder/file operation handling (empty filename?)
// ToDo: log to file

var map = {},
 http = require('http'),
 https = require('https'),
 fs = require('fs'),
 mime = require('mime-types'),
 path = require('path'),
 conf = require('./config');

function mkdirSync(path) {
  try {
    fs.mkdirSync(path);    
  } catch(e) {
    if ( e.code != 'EEXIST' ) throw e;
  }
}

function mkdirpSync(dirpath) {
  var parts = dirpath.split('/');
  for( var i = 1; i <= parts.length; i++ ) {
    mkdirSync( path.join.apply(null, parts.slice(0, i)) );
  }
}

const destBase = conf.cachePath;


function init() {
  console.log('init');
  console.log( conf.proxyMapUrl );
  fetcher(conf.proxyMapUrl).get(conf.proxyMapUrl, function(res) {
    var body = '';
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      map = JSON.parse(body);
      console.log(map);
    });
  }).on('error', function() {
    console.log('Failed to load proxy map');
  });
}

function processRequest(req, cb) {
  var content = [],
    targetDomain = getTargetDomain(req.headers[conf.header]);
  
  if (map == {}) {
    console.log('map is not loaded yet');
    return cb({ error: 404 });
  }
  if (!targetDomain) {
    return cb({ error: 404 });
  }  
  
  proxyFile(req.url, targetDomain, cb);
}

function proxyFile(baseUrl, targetDomain, cb) {
  var url = [targetDomain, baseUrl].join('');
  var dest = [destBase, baseUrl.split(/[?#]/)[0]].join('');
   
  var request = fetcher(url).get(url, function(response) {
    if (response.statusCode >= 300) {
      return cb({ error: 404, message: `Fetch failed (${response.statusCode}) from ${url}` });
    }
    mkdirpSync(urlToPath(baseUrl));
    var file = fs.createWriteStream(dest);
    response.pipe(file);
    file.on('finish', function() {
      file.close(function() { cb({
        contentType: mime.lookup(dest),
        path: dest 
      }) });
    });
  }).on('error', function(err) {
    fs.unlink(dest);
    if (cb) cb({ error: 404, message: err.message });
  });
}

function fetcher(url) {
  return url.match(/^https/) ? https : http;
}

function extractParts(host) {
  return host.split(':')[0].match(/([^.]+)\.?(.*)/).splice(1).filter( function(el){ return el; } );
}

function urlToPath(url) {
  return [destBase, (url.match(/^\/(.*)\/.*$/) || [null]).pop()].filter( function(el) { return el; } ).join('/');
}

function getTargetDomain(host) {
  var parts = extractParts(host);
  return getMap(parts[parts.length - 1]) || getMap(parts.join('.')) || null; 
}

function getMap(domain) {
  return map[domain];
}

module.exports = {
  init: init,
  process: processRequest,  
} 