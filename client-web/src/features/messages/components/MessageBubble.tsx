import type React from 'react'
import { FileText, Download } from 'lucide-react'

interface Message {
    content: string
    senderPublicToken: string
    attachments?: {
        type: 'image' | 'file'
        url: string
        name: string
        size?: number
    }[]
    timeSent: Date
}
interface MessageBubbleProps {
    message: Message
    isUser: boolean
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser }) => {
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return ''
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
        if (bytes === 0) return '0 Byte'
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i]
    }

    return (
        <div className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] ${isUser ? 'rounded-tl-lg rounded-tr-lg rounded-bl-lg bg-blue-600 text-white' : 'rounded-tl-lg rounded-tr-lg rounded-br-lg bg-[#ffffff1a] text-white'} overflow-hidden`}>
                {message.attachments && message.attachments.length > 0 && (
                    <div className="mb-2">
                        {message.attachments.map((attachment, index) => (
                            <div key={index} className="mb-2">
                                {attachment.type === 'image' ? (
                                    <div className="overflow-hidden rounded-lg">
                                        <img src={attachment.url || '/placeholder.svg'} alt={attachment.name} className="h-auto max-w-full" />
                                        <div className="flex items-center justify-between p-2 text-xs">
                                            <span>{attachment.name}</span>
                                            <button className="text-white hover:text-gray-200">
                                                <Download className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center rounded-lg bg-[#00000033] p-3">
                                        <FileText className="mr-3 h-8 w-8" />
                                        <div className="flex-1">
                                            <p className="truncate text-sm font-medium">{attachment.name}</p>
                                            <p className="text-xs text-gray-300">{formatFileSize(attachment.size)}</p>
                                        </div>
                                        <button className="ml-2 text-white hover:text-gray-200">
                                            <Download className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {message.content && (
                    <div className="p-3">
                        <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                    </div>
                )}

                <div className={`px-3 pb-1 text-xs ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>{formatTime(message.timeSent)}</div>
            </div>
        </div>
    )
}

export default MessageBubble
