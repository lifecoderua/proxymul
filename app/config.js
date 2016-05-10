var _ = require('lodash'), 
  defaults = require('./../config/defaults'),
  overrides = {};

try {
  overrides = require('./../config/overrides');
} catch(e) {
  console.log('Config overrides may be added at config/overrides.js');
} 
  

module.exports = _.extend(defaults, overrides);