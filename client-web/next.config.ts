import { NextConfig } from 'next'

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
    },
    env: {
        NEXT_PUBLIC_BACKEND_SERVER: process.env.NEXT_PUBLIC_BACKEND_SERVER,
        NEXT_PUBLIC_FILE_SERVER: process.env.NEXT_PUBLIC_FILE_SERVER,
        NEXT_PUBLIC_PROJECTS_SERVER: process.env.NEXT_PUBLIC_PROJECTS_SERVER,
        NEXT_PUBLIC_TASKS_SERVER: process.env.NEXT_PUBLIC_TASKS_SERVER,
        NEXT_PUBLIC_DEPLOYMENTS_SERVER: process.env.NEXT_PUBLIC_DEPLOYMENTS_SERVER,
        NEXT_PUBLIC_MESSAGE_SERVER: process.env.NEXT_PUBLIC_MESSAGE_SERVER
    }
}

export default nextConfig
