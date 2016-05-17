module.exports = {
  port: 5000,
  header: 'host',
  cachePath: './public/proxy_cache',
  proxyMapUrl: process.env.PROXY_MAP || 'http://localhost/api/v0/domains/map.json',
  // Storage type: 'none', 'file' //, 'db'
  storage: 'file'
};