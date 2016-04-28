/*
 * Core ProxyMul
 * 
 * Proxy files from multiple mapped domains.
 * Mapping:Hash { requestDomain1: proxyDomain1, ... }
 * Entry data: [sub.]domain.dot.com[:port] 
 * Output data: guessed content-type header + file
 *  
 */

var map = {};
var http = require('http');
var fs = require('fs');

function init() {
  map = require('./domains_map');
}

function processRequest(req, cb) {
  var content = [],
    targetDomain = getTargetDomain(req.headers.host);
  
  if (!targetDomain) {
    cb({ error: 404 });
  }    
  
  content.push(`=== Welcome aboard! ===`);
  content.push(`host ${targetDomain}`);
  content.push(`path ${req.url}`);
  
  

  
  
  cb({
    contentType: 'text/plain',
    data: content.join('\n')
  });
}

function proxyFile(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
}


function extractParts(host) {
  return host.split(':')[0].match(/([^.]+)\.?(.*)/).splice(1).filter( function(el){ return el; } )
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