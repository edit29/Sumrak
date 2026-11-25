module.exports = {
  basePath: '/miniapp',
  outputFileTracingRoot: __dirname,
  output: 'standalone',
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:8080';
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};
