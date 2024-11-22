import { Inter } from 'next/font/google'
import './globals.css'
import Meta from '@/Meta/Meta'
import NavBar from '@/features/navBar/NavBar'
import SessionProvider from '../components/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <Meta title="BMA" description="BMA" keywords="bank management " />
            <body className={inter.className}>
                <SessionProvider>
                    <NavBar />
                    {children}
                </SessionProvider>
            </body>
        </html>
    )
}
