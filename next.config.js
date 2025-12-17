/** @type {import('next').NextConfig} */

const nextConfig = {
    images: {
        domains: ['images.unsplash.com'],
    },
    env: {
        TRACKING_API_KEY: process.env.TRACKING_API_KEY,
    }
};



module.exports = nextConfig;