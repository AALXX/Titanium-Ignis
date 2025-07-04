'use client'

import React from 'react'

import Link from 'next/link'
import { ArrowLeft,  Search } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="flex h-full w-full flex-col bg-[#00000044] text-zinc-100">
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 md:px-12 lg:px-24 xl:px-32">
                <div className="mx-auto w-full max-w-3xl text-center">
                    <div className="relative mx-auto mb-8 flex h-40 w-40 items-center justify-center">
                        <div className="absolute inset-0 animate-pulse rounded-full bg-zinc-900/50"></div>
                        <Search className="h-20 w-20 text-zinc-400" />
                    </div>

                    <h1 className="mb-4 text-5xl font-bold tracking-tighter md:text-7xl">
                        <span className="text-red-500">404</span> | Page Not Found
                    </h1>

                    <p className="mx-auto mb-8 max-w-2xl text-xl text-zinc-400 md:text-2xl">The page you're looking for doesn't exist or has been moved to another location.</p>

                    <div className="grid gap-4 sm:flex sm:justify-center sm:gap-6">
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-6 py-3 text-lg font-medium text-gray-100 transition-colors hover:bg-zinc-800 focus:ring-2 focus:ring-zinc-700 focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-none"
                        >
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Back to Home
                        </Link>
                    </div>

                    
                </div>
            </main>

            <footer className="w-full  ">
                <div className="w-full self-center px-4 py-8 text-center">
                    <p className="text-sm text-zinc-400">© 2025 Titanium Ignis. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
