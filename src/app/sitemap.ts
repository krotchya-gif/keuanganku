import type { MetadataRoute } from 'next';

const baseUrl = 'https://keuanganku.fun';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/login`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/register`, changeFrequency: 'monthly', priority: 0.7 },
  ];
}
