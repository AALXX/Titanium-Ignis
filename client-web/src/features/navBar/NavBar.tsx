'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAccount } from '@/lib/redux/accountSlice'
import { makeStore } from '@/lib/redux/store'
import { Provider } from 'react-redux'
import type { AppDispatch, RootState } from '@/lib/redux/store'

const store = makeStore()

const NavBarContent = () => {
    const [isOpen, setIsOpen] = useState(false)
    const dispatch = useDispatch<AppDispatch>()
    const user = useSelector((state: RootState) => state.account.user)
    const authenticated = useSelector((state: RootState) => state.account.authenticated)
    const status = useSelector((state: RootState) => state.account.status)

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchAccount())
        }
    }, [status, dispatch, user, authenticated])

    return (
        <nav className="bg-navbar-grey flex h-24 w-full grow-0 items-center justify-between bg-black/50 px-4">
            <div className={`fixed inset-0 bg-black transition-opacity duration-500 ease-in-out ${isOpen ? 'opacity-50' : 'pointer-events-none opacity-0'}`} aria-hidden="true"></div>
            <div
                className={`bg-navbar-grey fixed inset-y-0 left-0 z-30 flex h-screen w-60 transform flex-col bg-black/75 shadow-lg transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
            >
                <h1 className="mt-10 self-center text-2xl font-bold text-white">Titanium Ignis</h1>
                <nav className="mt-10 flex flex-col gap-4 px-4">
                    <NavLink href="/">HOME</NavLink>
                    <NavLink href="/projects">PROJECTS</NavLink>
                    <NavLink href="/messages">MESSAGES</NavLink>
                </nav>
            </div>

            <div className="z-20 cursor-pointer text-white" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
                {authenticated ? (
                    <>{user?.name ? <h1 className="text-lg font-bold">{`Welcome, ${user.name}`}</h1> : <h1 className="text-lg font-bold">Loading...</h1>}</>
                ) : (
                    <h1 className="text-lg font-bold">Titanium Ignis</h1>
                )}
            </div>

            <Link href="/account">
                {authenticated ? (
                    <Image className="z-10 h-14 w-14 rounded-full" src={user?.image || `${process.env.NEXT_PUBLIC_FILE_SERVER}/accounts/no_auth?cache=none`} alt="User Avatar" width={48} height={48} />
                ) : (
                    <Image className="z-10 h-14 w-14 rounded-full" src={`${process.env.NEXT_PUBLIC_FILE_SERVER}/accounts/no_auth?cache=none`} alt="Default Avatar" width={48} height={48} />
                )}
            </Link>
        </nav>
    )
}

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link href={href} className="w-full">
        <button className="h-11 w-full cursor-pointer rounded-xl border-2 bg-none text-white transition-colors hover:bg-white/10">{children}</button>
    </Link>
)

const NavBar = () => (
    <Provider store={store}>
        <NavBarContent />
    </Provider>
)

export default NavBar
