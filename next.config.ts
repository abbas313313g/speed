
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_TELEGRAM_BOT_TOKEN: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    APIFY_API_KEY: "apify_api_4EjH6cSs3dQsT3a0bsIqakaxGRjxpw0GaS3f",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
