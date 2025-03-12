'use client'

import type React from 'react'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CustomCollapsibleProps {
    title: React.ReactNode
    children: React.ReactNode
    defaultOpen?: boolean
    className?: string
}

const CollapsibleList = ({ title, children, defaultOpen = false, className = '' }: CustomCollapsibleProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0)
    const ref = useRef<HTMLDivElement>(null)

    const toggleOpen = () => setIsOpen(prev => !prev)

    useEffect(() => {
        if (isOpen) {
            setHeight(ref.current?.getBoundingClientRect().height)
        } else {
            setHeight(0)
        }
    }, [isOpen])

    return (
        <div className={`w-full overflow-hidden rounded-xl bg-[#4e4e4e85] ${className}`}>
            <button className="flex w-full items-center justify-between p-3 font-medium text-white transition-colors hover:bg-[#5a5a5a85]" onClick={toggleOpen} aria-expanded={isOpen}>
                <div className="flex items-center gap-2 text-left">{title}</div>
                {isOpen ? <ChevronUp className="h-4 w-4 text-white/70" /> : <ChevronDown className="h-4 w-4 text-white/70" />}
            </button>
            <div className="overflow-hidden transition-[height] duration-300 ease-in-out" style={{ height: height }}>
                <div ref={ref}>
                    <div className="p-3 text-white/90">{children}</div>
                </div>
            </div>
        </div>
    )
}

export default CollapsibleList
