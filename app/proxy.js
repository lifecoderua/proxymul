/*
 * Core ProxyMul
 * 
 * Proxy files from multiple mapped domains.
 * Mapping:Hash { requestDomain1: proxyDomain1, ... }
 * Entry data: [sub.]domain.dot.com[:port] 
 * Output data: guessed content-type header + file
 *  
 */

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
  if (dirpath[0] == '/') { parts[0] = '/' + parts[0]; } 
  for( var i = 1; i <= parts.length; i++ ) {
    mkdirSync( path.join.apply(null, parts.slice(0, i)) );
  }
}

const destBase = conf.cachePath;


function init() {
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
    sourceDomain = getSourceDomain(req.headers[conf.header]);
  
  if (map == {}) {
    console.log('map is not loaded yet');
    return cb({ error: 404 });
  }
  if (!sourceDomain) {
    return cb({ error: 404 });
  }  
  
  proxyFile(req.url, sourceDomain, cb);
}

function proxyFile(baseUrl, sourceDomain, cb) {
  var url = [map[sourceDomain], baseUrl].join('');
  // ToDo: use `path` if viable  
  var cleanDest = baseUrl.split(/[?#]/)[0];
  if (cleanDest[cleanDest.length-1] == '/') { cleanDest += 'x--root.html'; }
  var dest = [destBase, '/', sourceDomain, cleanDest].join('');
   
  var request = fetcher(url).get(url, function(response) {
    if (response.statusCode >= 300) {
      return cb({ error: 404, message: `Fetch failed (${response.statusCode}) from ${url}` });
    }
    mkdirpSync(urlToPath(baseUrl, sourceDomain));
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

function urlToPath(url, sourceDomain) {
  return [destBase, sourceDomain, (url.match(/^\/(.*)\/.*$/) || [null]).pop()].filter( function(el) { return el; } ).join('/');
}

function getSourceDomain(host) {
  var parts = extractParts(host);
  return checkMappedDomain(parts[parts.length - 1]) || checkMappedDomain(parts.join('.')) || null; 
}

function checkMappedDomain(domain) {
  return map[domain] ? domain : null;
}

module.exports = {
  init: init,
  process: processRequest,  
} 