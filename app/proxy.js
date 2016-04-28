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
 path  = require('path');
//  mkdirp = require('mkdirp'); // fails for Heroku

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

const destBase = './public/proxy_cache/';


function init() {
  map = require('./domains_map');
}

function processRequest(req, cb) {
  var content = [],
    targetDomain = getTargetDomain(req.headers.host);
  
  if (!targetDomain) {
    cb({ error: 404 });
    return;    
  }  
  
  proxyFile(req.url, targetDomain, function(result) {
    console.log(result);
    cb(result);
  });
}

function proxyFile(baseUrl, targetDomain, cb) {
  var url = [targetDomain, baseUrl].join('');
  var dest = [destBase, baseUrl].join('');
  
  mkdirpSync(urlToPath(baseUrl));
  var file = fs.createWriteStream(dest);
  var request = fetcher(url).get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(function() { cb({
        contentType: mime.lookup(dest),
        path: dest 
      }) });  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
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
  return destBase + (url.match(/^\/(.*)\/.*$/) || ['']).pop();
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