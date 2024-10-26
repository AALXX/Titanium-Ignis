import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: '127.0.0.1',
                port: '5600'
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com'
            }
        ],

        dangerouslyAllowSVG: true
    }
}

export default nextConfig
