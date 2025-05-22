import type React from 'react'
import { FileText, Download } from 'lucide-react'

interface Message {
    content: string
    senderpublictoken: string
    attachments?: {
        type: 'image' | 'file'
        url: string
        name: string
        size?: number
    }[]
    timesent: Date
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
        <div className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
            <div
                className={`w-fit max-w-[80%] sm:max-w-[75%] ${
                    isUser ? 'rounded-tl-lg rounded-tr-lg rounded-bl-lg bg-blue-600 text-white' : 'rounded-tl-lg rounded-tr-lg rounded-br-lg bg-[#ffffff1a] text-white'
                } flex flex-col overflow-hidden`}
                style={{ wordBreak: 'break-word' }}
            >
                {message.attachments?.map((attachment, index) => (
                    <div key={index} className="mb-2">
                        {attachment.type === 'image' ? (
                            <div className="overflow-hidden rounded-lg">
                                <img
                                    src={attachment.url}
                                    alt={attachment.name}
                                    className="h-auto max-h-[300px] w-full rounded object-contain"
                                    loading="lazy"
                                    onError={e => {
                                        e.currentTarget.src = '/placeholder.svg?height=300&width=300'
                                    }}
                                />
                                <div className="flex items-center justify-between p-2 text-xs">
                                    <span className="max-w-[70%] truncate">{attachment.name}</span>
                                    <a href={attachment.url} download={attachment.name} className="text-white hover:text-gray-200" onClick={e => e.stopPropagation()}>
                                        <Download className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center rounded-lg bg-[#00000033] p-3">
                                <FileText className="mr-3 h-8 w-8 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{attachment.name}</p>
                                    <p className="text-xs text-gray-300">{formatFileSize(attachment.size)}</p>
                                </div>
                                <a href={attachment.url} download={attachment.name} className="ml-2 flex-shrink-0 text-white hover:text-gray-200" onClick={e => e.stopPropagation()}>
                                    <Download className="h-4 w-4" />
                                </a>
                            </div>
                        )}
                    </div>
                ))}

                {message.content && (
                    <div className="p-3">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                )}

                <div className={`px-3 pb-1 text-xs ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>{formatTime(message.timesent instanceof Date ? message.timesent : new Date(message.timesent))}</div>
            </div>
        </div>
    )
}

export default MessageBubble
