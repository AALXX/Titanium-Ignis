'use client'

import type React from 'react'
import { useState, useRef, useEffect } from 'react'
import { Paperclip, Send, ImageIcon, File, X, Smile } from 'lucide-react'
import MessageBubble from './MessageBubble'
import { Socket } from 'socket.io-client'

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

const Conversation: React.FC<{
    selectedChatToken: string
    socket: Socket
    userSessionToken: string
    otherPersonName?: string
}> = ({ selectedChatToken, otherPersonName = 'User', socket, userSessionToken }) => {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputMessage, setInputMessage] = useState('')
    const [attachments, setAttachments] = useState<File[]>([])
    const [isTyping, setIsTyping] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        if (!selectedChatToken) return

        socket.emit('join-message-room', {
            chatToken: selectedChatToken,
            userSessionToken: userSessionToken
        })
    }, [selectedChatToken])

    const handleSendMessage = () => {
        if (inputMessage.trim() === '' && attachments.length === 0) return

        const newMessage: Message = {
            content: inputMessage,
            senderPublicToken: '',
            attachments:
                attachments.length > 0
                    ? attachments.map(file => ({
                          type: file.type.startsWith('image/') ? 'image' : 'file',
                          url: URL.createObjectURL(file),
                          name: file.name,
                          size: file.size
                      }))
                    : undefined,
            timeSent: new Date()
            
        }

        setMessages([...messages, newMessage])
        setInputMessage('')
        setAttachments([])

        if (socket) {
            socket.emit('send-message', {
                chatToken: selectedChatToken,
                userSessionToken: userSessionToken,
                message: newMessage
            })
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files)
            setAttachments([...attachments, ...filesArray])
        }
    }

    const removeAttachment = (index: number) => {
        const newAttachments = [...attachments]
        newAttachments.splice(index, 1)
        setAttachments(newAttachments)
    }

    const formatDate = (date: Date) => {
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        if (date.toDateString() === today.toDateString()) {
            return 'Today'
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday'
        } else {
            return date.toLocaleDateString()
        }
    }

    // Group messages by date
    const groupedMessages: { [key: string]: Message[] } = {}
    messages.forEach(message => {
        const dateKey = formatDate(message.timeSent)
        if (!groupedMessages[dateKey]) {
            groupedMessages[dateKey] = []
        }
        groupedMessages[dateKey].push(message)
    })

    return (
        <div className="flex h-full w-full flex-col bg-[#00000085]">
            <div className="flex items-center border-b border-[#ffffff1a] bg-[#0000004d] p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffffff1a]">{otherPersonName.charAt(0).toUpperCase()}</div>
                <div className="ml-3">
                    <h3 className="font-medium text-white">{otherPersonName}</h3>
                    <p className="text-xs text-gray-400">{isTyping ? 'Typing...' : 'Online'}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#0000000d] p-4">
                {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                    <div key={date}>
                        <div className="my-4 flex justify-center">
                            <span className="rounded-full bg-[#0000004d] px-2 py-1 text-xs text-gray-400">{date}</span>
                        </div>
                        {dateMessages.map((message, index) => (
                            <MessageBubble message={message} key={index} isUser={message.senderPublicToken === userSessionToken} />
                        ))}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 bg-[#0000004d] p-2">
                    {attachments.map((file, index) => (
                        <div key={index} className="relative flex items-center rounded-md bg-[#ffffff1a] p-2">
                            {file.type.startsWith('image/') ? <ImageIcon className="mr-2 h-4 w-4 text-white" /> : <File className="mr-2 h-4 w-4 text-white" />}
                            <span className="max-w-[100px] truncate text-xs text-white">{file.name}</span>
                            <button className="ml-2 text-gray-400 hover:text-white" onClick={() => removeAttachment(index)}>
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <div className="border-t border-[#ffffff1a] bg-[#0000004d] p-4">
                <div className="flex items-end">
                    <div className="flex-1 overflow-hidden rounded-md bg-[#ffffff1a]">
                        <textarea
                            className="w-full resize-none bg-transparent p-3 text-white outline-none"
                            placeholder="Type a message..."
                            rows={1}
                            value={inputMessage}
                            onChange={e => setInputMessage(e.target.value)}
                            onKeyDown={handleKeyPress}
                            style={{ maxHeight: '120px' }}
                        />
                    </div>

                    <div className="ml-2 flex">
                        <button className="mr-2 rounded-full bg-[#ffffff1a] p-2 text-white hover:bg-[#ffffff33]" onClick={() => imageInputRef.current?.click()}>
                            <ImageIcon className="h-5 w-5" />
                            <input type="file" ref={imageInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                        </button>

                        <button className="mr-2 rounded-full bg-[#ffffff1a] p-2 text-white hover:bg-[#ffffff33]" onClick={() => fileInputRef.current?.click()}>
                            <Paperclip className="h-5 w-5" />
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
                        </button>

                        <button className="mr-2 rounded-full bg-[#ffffff1a] p-2 text-white hover:bg-[#ffffff33]">
                            <Smile className="h-5 w-5" />
                        </button>

                        <button className="rounded-full bg-blue-600 p-2 text-white hover:bg-blue-700" onClick={handleSendMessage}>
                            <Send className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Conversation
