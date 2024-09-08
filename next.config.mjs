import { config } from 'dotenv';
config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    GOOGLE_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
  },
};

export default nextConfig;