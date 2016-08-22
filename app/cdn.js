var Q = require('q')

var conf = require('./config').cdn;
var selectel = require('selectel-storage');

var shared = {};

selectel.setConf(conf.login, conf.key);

function containerCreate(resolve) {
  return Q.Promise(function(resolve) {
    // console.log(shared);
    selectel.createContainer(shared.repo, function (err , data) {
      // console.log('> createContainer', err, data);
      resolve([err, data]);
    }, {
      'X-Container-Meta-Type': 'public'
    });
  });
}

function fileUpload() {
  return Q.Promise(function(resolve) {
    // selectel.uploadFile('./index.js', shared.repo + shared.path, function (err , data) {
    selectel.uploadData(shared.file, shared.repo + shared.path, function (err , data) {
      // console.log('> fileUpload', err, data);
      resolve([err, data]);
    }, {
      'X-Delete-After': '86400' 
    });
  })
}

function store(repo, path, file) {
  shared = {
    repo: repo, 
    path: path, 
    file: file 
  }
  Q.Promise( (resolve) => resolve() )
  .then(containerCreate)
  .then(fileUpload)
  // .then( () => console.log('yay') )
}

module.exports = {
  store: store
}