'use client'

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import TruncatedText from './TruncateText'

interface CopyTextDisplayProps {
    text: string
    className?: string
}

const CopyTextDisplay = ({ text, className }: CopyTextDisplayProps) => {
    const [copied, setCopied] = useState(false)

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy text: ', err)
        }
    }

    return (
        <div className={className}>
            <TruncatedText text={text} characters={30} />
            <button onClick={copyToClipboard} className="shrink-0 text-white cursor-pointer">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
        </div>
    )
}

export default CopyTextDisplay
