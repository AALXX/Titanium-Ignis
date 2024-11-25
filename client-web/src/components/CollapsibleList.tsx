'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CustomCollapsibleProps {
    title: string
    children: React.ReactNode
    defaultOpen?: boolean
}

const CollapsibleList = ({ title, children, defaultOpen = false }: CustomCollapsibleProps) => {
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
        <div className="w-full overflow-hidden rounded-md border border-[#333333]">
            <button className="flex w-full items-center justify-between bg-[#333333] p-4 font-medium text-white transition-colors hover:bg-[#494949]" onClick={toggleOpen} aria-expanded={isOpen}>
                {title}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <div className="transition-[height] duration-300 ease-in-out" style={{ height: height }}>
                <div ref={ref}>
                    <div className="p-4">{children}</div>
                </div>
            </div>
        </div>
    )
}

export default CollapsibleList
