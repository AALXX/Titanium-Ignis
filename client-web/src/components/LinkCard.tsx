import type React from 'react'
import Link from 'next/link'

interface LinkCardsProps {
    Title: string
    linkRef: string
    className?: string
}

const LinkCards: React.FC<LinkCardsProps> = ({ Title, linkRef, className }) => {
    return (
        <Link href={linkRef}>
            <div className={`flex items-center ${className}`}>
                <h1 className="text-xs font-medium text-white">{Title}</h1>
            </div>
        </Link>
    )
}

export default LinkCards
