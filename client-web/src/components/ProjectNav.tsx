'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, ListTodo, Code, Rocket } from 'lucide-react'

interface ProjectNavProps {
    projectToken: string
}

export function ProjectNav({ projectToken }: ProjectNavProps) {
    const pathname = usePathname()

    const navItems = [
        {
            title: 'TEAM MANAGEMENT',
            icon: <Users className="h-4 w-4" />,
            href: `/projects/${projectToken}/team-management`,
            width: 'w-[14rem]'
        },
        {
            title: 'TASK LIST',
            icon: <ListTodo className="h-4 w-4" />,
            href: `/projects/${projectToken}/tasks`,
            width: 'w-[10rem]'
        },
        {
            title: 'CODE',
            icon: <Code className="h-4 w-4" />,
            href: `/projects/${projectToken}/code`,
            width: 'w-[10rem]'
        },
        {
            title: 'DEPLOYMENTS',
            icon: <Rocket className="h-4 w-4" />,
            href: `/projects/${projectToken}/deployments`,
            width: 'w-[10rem]'
        }
    ]

    return (
        <div className="relative">
            <div className="flex w-full flex-row overflow-x-auto">
                {navItems.map(item => {
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`ml-2 h-[3rem] ${item.width} flex items-center justify-center rounded-t-xl border-t border-r border-l border-transparent bg-[#0000003d] ${isActive ? 'border-gray-700 bg-[#00000060]' : 'hover:bg-[#00000050]'} group transition-colors duration-200`}
                        >
                            <div className="flex items-center space-x-2">
                                <span className="text-gray-400 transition-colors duration-200 group-hover:text-white">{item.icon}</span>
                                <span className="text-xs font-medium text-gray-300 transition-colors duration-200 group-hover:text-white">{item.title}</span>
                            </div>

                            {isActive && <div className="absolute bottom-0 h-0.5 w-full bg-gray-300" />}
                        </Link>
                    )
                })}
            </div>
            <hr className="h-px w-full border-0 bg-white" />
        </div>
    )
}
