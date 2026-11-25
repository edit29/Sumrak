import { SITE_URL } from '../lib/site';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/owner', '/api/', '/o/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
