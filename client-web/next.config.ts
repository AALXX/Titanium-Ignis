import { NextConfig } from "next"

const isDocker = process.env.DOCKER_ENV === 'true'

const fileServerHost = isDocker ? 'file-server' : 'localhost'

const nextConfig: NextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
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
