import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/onboarding', '/arus-kas', '/budgeting', '/kpr', '/checkup', '/evaluasi', '/kalendar', '/kas-rutin', '/net-worth', '/pembayaran', '/settings', '/tabungan'],
    },
    sitemap: 'https://keuanganku.fun/sitemap.xml',
  };
}
