import { Inter } from 'next/font/google'
import './globals.css'
import Meta from '@/Meta/Meta'
import NavBar from '@/features/navBar/NavBar'
import { SessionProvider } from 'next-auth/react'
import type React from 'react' // Added import for React

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <Meta
                title="Titanium Ignis"
                description="Titanium Ignis is a platform for project management, task management, team collaboration, code management, and deployment"
                keywords="project management, task management, team collaboration, code management, deployment"
            />
            <body className={`${inter.className} flex h-screen flex-col`}>
                <SessionProvider>
                    <NavBar />
                    {children}
                </SessionProvider>
            </body>
        </html>
    )
}
