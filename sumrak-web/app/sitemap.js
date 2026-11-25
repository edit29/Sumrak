import { SITE_URL } from '../lib/site';

export default function sitemap() {
  return ['/', '/contacts', '/privacy'].map(path => ({
    url: new URL(path, SITE_URL).toString(),
  }));
}
