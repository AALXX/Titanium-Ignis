'use client'

import type React from 'react'
import { useState, useRef, useEffect } from 'react'
import { Paperclip, Send, ImageIcon, File, X, Smile } from 'lucide-react'
import type { Socket } from 'socket.io-client'
import MessageBubble from './MessageBubble'
import axios from 'axios'

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
    const [textBarDiff, setTextBarDiff] = useState<number>(240)
    const [userPublicToken, setUserPublicToken] = useState<string>('')
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
    const [uploadedFileUrls, setUploadedFileUrls] = useState<{ [key: string]: string }>({})

    const listenersSetupRef = useRef<boolean>(false)

    useEffect(() => {
        if (messagesEndRef.current) {
            const container = messagesEndRef.current.parentElement
            if (container) {
                const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 300
                messagesEndRef.current.scrollIntoView({
                    behavior: isNearBottom ? 'smooth' : 'auto',
                    block: 'end'
                })
            }
        }
    }, [messages])

    useEffect(() => {
        if (!selectedChatToken) return

        if (listenersSetupRef.current) return

        console.log('Setting up socket listeners')
        listenersSetupRef.current = true

        socket.on('ALL_MESSAGES', (data: { messages: Message[]; error: boolean }) => {
            if (data.error || !data.messages) return
            const parsedMessages = data.messages.map(msg => ({
                ...msg,
                timesent: new Date(msg.timesent)
            }))

            console.log(parsedMessages)
            setMessages(prev => {
                // Avoid duplicate messages by checking IDs
                const existingIds = new Set(prev.map(msg => (msg as any).id))
                const newMessages = parsedMessages.filter(msg => !(msg as any).id || !existingIds.has((msg as any).id))
                return [...prev, ...newMessages]
            })
        })

        socket.on('JOINED_ROOM', (data: { userPublicToken: string; error: boolean }) => {
            if (data.error || !data.userPublicToken) return
            setUserPublicToken(data.userPublicToken)
        })

        socket.on('NEW_MESSAGE', (data: { message: Message; error: boolean }) => {
            if (data.error || !data.message) return
            setMessages(prev => [...prev, data.message])
        })

        socket.emit('join-message-room', {
            chatToken: selectedChatToken,
            userSessionToken: userSessionToken
        })

        return () => {
            console.log('Cleaning up socket listeners')
            socket.off('ALL_MESSAGES')
            socket.off('JOINED_ROOM')
            socket.off('NEW_MESSAGE')
            listenersSetupRef.current = false
        }
    }, [selectedChatToken, socket, userSessionToken])

    // Rest of the component remains the same...

    const handleSendMessage = () => {
        if (inputMessage.trim() === '' && attachments.length === 0) return

        const newMessage: Message = {
            content: inputMessage,
            senderpublictoken: userPublicToken,
            attachments:
                attachments.length > 0
                    ? attachments.map(file => ({
                          type: file.type.startsWith('image/') ? 'image' : 'file',
                          url: uploadedFileUrls[file.name] || URL.createObjectURL(file),
                          name: file.name,
                          size: file.size
                      }))
                    : undefined,
            timesent: new Date()
        }

        setMessages([...messages, newMessage])
        setInputMessage('')
        setAttachments([])
        setUploadedFileUrls({})

        if (socket) {
            socket.emit('send-message', {
                chatToken: selectedChatToken,
                userSessionToken: userSessionToken,
                message: newMessage
            })
        }
        setTextBarDiff(240)
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
            setTextBarDiff(290)

            const initialProgress: { [key: string]: number } = {}
            filesArray.forEach(file => {
                initialProgress[file.name] = 0
            })
            setUploadProgress(initialProgress)

            const formData = new FormData()
            filesArray.forEach(file => {
                formData.append('files', file)
            })

            axios
                .post(`${process.env.NEXT_PUBLIC_MESSAGE_SERVER}/upload`, formData, {
                    onUploadProgress: progressEvent => {
                        if (progressEvent.total) {
                            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                            const updatedProgress: { [key: string]: number } = {}
                            filesArray.forEach(file => {
                                updatedProgress[file.name] = percentCompleted
                            })
                            setUploadProgress(updatedProgress)
                        }
                    }
                })
                .then(resp => {
                    const newUploadedUrls: { [key: string]: string } = { ...uploadedFileUrls }

                    if (resp.data && Array.isArray(resp.data)) {
                        resp.data.forEach((item, index) => {
                            if (index < filesArray.length && item.url) {
                                newUploadedUrls[filesArray[index].name] = item.url
                            }
                        })
                        setUploadedFileUrls(newUploadedUrls)
                    }

                    setTimeout(() => {
                        setUploadProgress({})
                    }, 1000)
                })
                .catch(error => {
                    console.error('Upload failed:', error)
                    const errorProgress: { [key: string]: number } = {}
                    filesArray.forEach(file => {
                        errorProgress[file.name] = -1 // Use -1 to indicate error
                    })
                    setUploadProgress(errorProgress)
                })

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
        if (new Date(date).toDateString() === today.toDateString()) {
            return 'Today'
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday'
        } else {
            return date.toLocaleDateString()
        }
    }

    const sortedMessages = [...messages].sort((a, b) => new Date(a.timesent).getTime() - new Date(b.timesent).getTime())

    const groupedMessages: { [key: string]: Message[] } = {}
    sortedMessages.forEach(message => {
        const dateKey = formatDate(message.timesent)
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

            <div
                className="flex-1 overflow-y-auto bg-[#0000000d]"
                style={{
                    height: 'calc(100% - 130px)',
                    minHeight: '200px',
                    maxHeight: `calc(100vh - ${textBarDiff}px)`
                }}
            >
                <div className="p-4">
                    {Object.entries(groupedMessages)
                        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                        .map(([date, dateMessages]) => (
                            <div key={date}>
                                <div className="my-4 flex justify-center">
                                    <span className="rounded-full bg-[#0000004d] px-2 py-1 text-xs text-gray-400">{date}</span>
                                </div>
                                {dateMessages.map((message, index) => (
                                    <MessageBubble message={message} key={`${date}-${index}`} isUser={message.senderpublictoken === userPublicToken} />
                                ))}
                            </div>
                        ))}
                    <div ref={messagesEndRef} className="h-1" />
                </div>
            </div>

            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 bg-[#0000004d] p-2">
                    {attachments.map((file, index) => (
                        <div key={index} className="relative flex flex-col rounded-md bg-[#ffffff1a] p-2">
                            <div className="flex items-center">
                                {file.type.startsWith('image/') ? <ImageIcon className="mr-2 h-4 w-4 text-white" /> : <File className="mr-2 h-4 w-4 text-white" />}
                                <span className="max-w-[100px] truncate text-xs text-white">{file.name}</span>
                                <button className="ml-2 text-gray-400 hover:text-white" onClick={() => removeAttachment(index)}>
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                            {uploadProgress[file.name] !== undefined && (
                                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#ffffff33]">
                                    <div
                                        className={`h-full ${uploadProgress[file.name] === -1 ? 'bg-red-500' : 'bg-blue-500'}`}
                                        style={{ width: `${uploadProgress[file.name] === -1 ? 100 : uploadProgress[file.name]}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="border-t border-[#ffffff1a] bg-[#0000004d] p-4">
                <div className="flex items-end">
                    <textarea
                        className="max-h-32 w-full resize-none overflow-y-auto bg-transparent p-3 text-white outline-none"
                        placeholder="Type a message..."
                        rows={1}
                        value={inputMessage}
                        onChange={e => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                    />

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
