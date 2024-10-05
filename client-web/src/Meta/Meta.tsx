import React from 'react'
const Meta = ({ title, keywords, description }: { title: string; keywords: string; description: string }) => {
    return (
        <head>
            <title>{title}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="shortcut icon" href="/favicon.ico" />
            <meta name="keywords" content={keywords} />
            <meta name="description" content={description} />
            <meta charSet="utf-8" />
        </head>
    )
}

export default Meta
