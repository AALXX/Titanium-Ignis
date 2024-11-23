'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { getCookie } from 'cookies-next'
import { useSession } from 'next-auth/react'

import Image from 'next/image'

const NavBar = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const { data: session } = useSession()
    return (
        <nav className="bg-navbar-grey flex h-24 w-full items-center justify-between bg-black/50 px-4 flex-grow-0">
            <div className={`fixed inset-0 bg-black transition-opacity duration-500 ease-in-out ${isOpen ? 'opacity-50' : 'pointer-events-none opacity-0'}`} aria-hidden="true"></div>
            <div
                className={`bg-navbar-grey fixed inset-y-0 left-0 z-30 flex h-screen w-60 transform flex-col bg-black/55 shadow-lg transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                onMouseEnter={() => {
                    setIsOpen(true)
                }}
                onMouseLeave={() => {
                    setIsOpen(false)
                }}
            >
                <h1 className="mt-10 self-center text-white">LOGO</h1>
                <nav className="mt-10 flex flex-col gap-4 px-4">
                    <NavLink href="/">HOME</NavLink>
                    <NavLink href="/projects">PROJECTS</NavLink>
                </nav>
            </div>
            <h1
                className="z-20 cursor-pointer text-white"
                onMouseEnter={() => {
                    setIsOpen(true)
                }}
                onMouseLeave={() => {
                    setIsOpen(false)
                }}
            >
                Welcome, {session?.user?.name}
            </h1>

            <Link href={'/account'}>
                {session?.user?.image ? (
                    <Image className="z-10 h-12 w-12 rounded-full" src={session?.user?.image as string} alt="Picture of the author" width={48} height={48} />
                ) : (
                    <Image
                        className="z-10 h-12 w-12 rounded-full"
                        src={`${process.env.NEXT_PUBLIC_FILE_SERVER}/${getCookie('userPublicToken')}/Main_icon.png?cache=none`}
                        alt="Picture of the author"
                        width={48}
                        height={48}
                    />
                )}
            </Link>
        </nav>
    )
}

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link href={href} className="w-full">
        <button className="h-11 w-full rounded-xl border-2 bg-none text-white transition-colors hover:bg-white/10">{children}</button>
    </Link>
)

export default NavBar
