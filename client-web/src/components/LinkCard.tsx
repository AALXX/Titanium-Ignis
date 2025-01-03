import Link from 'next/link'
import React from 'react'

interface ILinkCardsProps {
    Title: string
    className: string
    linkRef: string
}

const LinkCards = (props: ILinkCardsProps) => {
    const { Title, className } = props

    return (
        <Link href={props.linkRef}>
            <div className={`flex flex-col ${className}`}>
                <h1 className="self-center text-xl text-white">{Title}</h1>
            </div>
        </Link>
    )
}

export default LinkCards
