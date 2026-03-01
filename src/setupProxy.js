const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    createProxyMiddleware({
      target: 'http://127.0.0.1:5000',
      changeOrigin: true,
      ws: true,
      // We don't want to strip /api because the backend routes also start with /api
      pathFilter: '/api',
    })
  );
};
