'use client'

import React from 'react'

import Link from 'next/link'
import { ArrowLeft,  Search } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="flex  w-full flex-col bg-zinc-950 text-zinc-100">
 

            <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 md:px-12 lg:px-24 xl:px-32">
                <div className="mx-auto w-full max-w-3xl text-center">
                    <div className="relative mx-auto mb-8 flex h-40 w-40 items-center justify-center">
                        <div className="absolute inset-0 animate-pulse rounded-full bg-zinc-800/50"></div>
                        <Search className="h-20 w-20 text-zinc-400" />
                    </div>

                    <h1 className="mb-4 text-5xl font-bold tracking-tighter md:text-7xl">
                        <span className="text-red-500">404</span> | Page Not Found
                    </h1>

                    <p className="mx-auto mb-8 max-w-2xl text-xl text-zinc-400 md:text-2xl">The page you're looking for doesn't exist or has been moved to another location.</p>

                    <div className="grid gap-4 sm:flex sm:justify-center sm:gap-6">
                        <Link href="/" className="px-6 py-3 text-lg">
                            <button className="px-6 py-3 text-lg">
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                Back to Home
                            </button>
                        </Link>
                    </div>

                    <div className="mt-16 border-t border-zinc-800 pt-8">
                        <h2 className="mb-6 text-2xl font-bold">Looking for something else?</h2>
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                            <Link href="/#features" className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:bg-zinc-800">
                                <h3 className="mb-2 font-bold">Features</h3>
                                <p className="text-sm text-zinc-400">Explore our powerful features</p>
                            </Link>
                            <Link href="/#pricing" className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:bg-zinc-800">
                                <h3 className="mb-2 font-bold">Pricing</h3>
                                <p className="text-sm text-zinc-400">View our pricing plans</p>
                            </Link>
                            <Link href="/#how-it-works" className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:bg-zinc-800">
                                <h3 className="mb-2 font-bold">How It Works</h3>
                                <p className="text-sm text-zinc-400">Learn how our platform works</p>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="w-full border-t border-zinc-800 bg-zinc-950">
                <div className="w-full self-center px-4 py-8 text-center">
                    <p className="text-sm text-zinc-400">© 2025 Titanium Ignis. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
