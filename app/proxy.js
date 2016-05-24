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
 conf = require('./config'),
 _ = require('lodash'),
 urlUtils = require('url');

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
  fetchMap();
  setInterval(fetchMap, 10*60*1000);
}

function fetchMap() {
  fetcher(conf.proxyMapUrl).get(conf.proxyMapUrl, function(res) {
    var body = '';
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      map = JSON.parse(body);
    });
  }).on('error', function() {
    // retry
    setTimeout(fetchMap, 30*1000);
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
  
  proxyFile(req, sourceDomain, cb);
}

function proxyFile(req, sourceDomain, cb) {
  var baseHeaders = _.clone(req.headers);
  var baseUrl = req.url;
  var url = [map[sourceDomain], baseUrl].join('');
  // ToDo: use `path` if viable  
  var cleanDest = baseUrl.split(/[?#]/)[0];
  if (cleanDest[cleanDest.length-1] == '/') { cleanDest += 'x--root.html'; }
  var dest = [destBase, '/', sourceDomain, cleanDest].join('');
  
  try {
    fs.accessSync(dest, fs.F_OK);
    return cb({
      contentType: mime.lookup(dest),
      stream: fs.createReadStream(dest) 
    });
  } catch (e) {}
   
  var requestOptions = _.extend(urlUtils.parse(url), { headers: baseHeaders });
  requestOptions.headers.host = requestOptions.hostname;

  var request = fetcher(url).get(requestOptions, function(response) {
    if (response.statusCode >= 300) {
      return cb({ error: 404, message: `Fetch failed (${response.statusCode}) from ${url}` });
    }
    
    switch(conf.storage) {
      case 'file':
        mkdirpSync(urlToPath(baseUrl, sourceDomain));
        var file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', function() {
          file.close(function() { cb({
            headers: { 'Content-Type': mime.lookup(dest) },
            stream: fs.createReadStream(dest) 
          }) });
        }); 
        break;
      
      case 'none':
      default:
        return cb({
          headers: response.headers,
          stream: response
        });
    }    
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