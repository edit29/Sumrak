// Браузер ходит на /api/* своего сайта, Next проксирует в Go.
module.exports = {
  output: 'standalone',
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:8080';
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};
