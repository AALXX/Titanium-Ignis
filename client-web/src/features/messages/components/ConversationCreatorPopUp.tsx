'use client'
import { useState, useEffect, useRef } from 'react'
import React, { Search, Users, User, Loader2, X } from 'lucide-react'
import { Socket } from 'socket.io-client'
import axios from 'axios'

interface UserType {
    id: number
    username: string
    useremail: string
    userpublictoken: string
    avatar: string
}

interface ConversationCreatorProps {
    onClose: () => void
    socket: Socket
    userSessionToken: string
}

const ConversationCreatorPopUp = ({ onClose, socket, userSessionToken }: ConversationCreatorProps) => {
    const [activeTab, setActiveTab] = useState('single')
    const [searchQuery, setSearchQuery] = useState('')
    const [groupName, setGroupName] = useState('')
    const [searchResults, setSearchResults] = useState<UserType[]>([])
    const [selectedUsers, setSelectedUsers] = useState<UserType[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        ;(async () => {
            if (searchQuery.length > 0  && searchQuery != null) {
                setIsLoading(true)

                const results = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_SERVER}/api/user-account-manager/search-users/${searchQuery}`)

                setSearchResults(results.data.usersData)
                setIsLoading(false)
                setShowDropdown(true)
            } else {
                setSearchResults([])
                setShowDropdown(false)
            }
        })()
    }, [searchQuery])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleSelectUser = (user: UserType) => {
        if (!selectedUsers.some(selectedUser => selectedUser.id === user.id)) {
            setSelectedUsers([...selectedUsers, user])
        }
        setSearchQuery('')
        setShowDropdown(false)
    }

    const handleRemoveUser = (userId: number) => {
        setSelectedUsers(selectedUsers.filter(user => user.id !== userId))
    }

    const handleCreateConversation = () => {
        if (activeTab === 'single' && selectedUsers.length === 1) {
            console.log('Creating single conversation with:', selectedUsers[0])

            socket.emit('create-conversation', {
                userSessionToken: userSessionToken,
                person2PublicToken: selectedUsers[0].userpublictoken
            })
            onClose()
        } else if (activeTab === 'group' && selectedUsers.length > 1 && groupName) {
            console.log('Creating group conversation:', {
                name: groupName,
                members: selectedUsers
            })
            // Add your API call here
            onClose()
        }
    }

    const isCreateButtonDisabled = (activeTab === 'single' && selectedUsers.length !== 1) || (activeTab === 'group' && (selectedUsers.length < 2 || !groupName))

    return (
        <div className="flex h-full w-full flex-col text-white">
            <h2 className="mb-6 text-center text-2xl font-bold text-white">New Conversation</h2>

            {/* Custom Tabs */}
            <div className="mb-6 w-full">
                <div className="grid w-full grid-cols-2 rounded-md bg-[#3a3a3a] p-1">
                    <button
                        className={`flex items-center justify-center gap-2 rounded-sm py-2 text-sm font-medium transition-colors ${
                            activeTab === 'single' ? 'bg-[#4a4a4a] text-white shadow-md' : 'text-gray-300 hover:bg-[#3f3f3f] hover:text-white'
                        }`}
                        onClick={() => setActiveTab('single')}
                    >
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">Single Chat</span>
                    </button>
                    <button
                        className={`flex items-center justify-center gap-2 rounded-sm py-2 text-sm font-medium transition-colors ${
                            activeTab === 'group' ? 'bg-[#4a4a4a] text-white shadow-md' : 'text-gray-300 hover:bg-[#3f3f3f] hover:text-white'
                        }`}
                        onClick={() => setActiveTab('group')}
                    >
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Group Chat</span>
                    </button>
                </div>

                <div className="mt-4 h-[30rem] overflow-y-auto pr-1" style={{ maxHeight: 'calc(90vh - 220px)' }}>
                    {activeTab === 'single' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="email-search" className="text-sm font-medium text-gray-200">
                                    Find a person by email
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        id="email-search"
                                        type="text"
                                        placeholder="Enter email address"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full rounded-md border border-gray-600 bg-[#2a2a2a] px-3 py-2 pl-10 text-sm text-white placeholder-gray-400 shadow-sm transition-colors focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none"
                                    />

                                    {/* Dropdown for search results */}
                                    {showDropdown && searchResults.length > 0 && (
                                        <div ref={dropdownRef} className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-600 bg-[#2a2a2a] shadow-lg">
                                            {searchResults.map(user => (
                                                <div
                                                    key={user.id}
                                                    className="flex cursor-pointer items-center gap-3 border-b border-gray-600 p-2 last:border-b-0 hover:bg-[#3a3a3a]"
                                                    onClick={() => handleSelectUser(user)}
                                                >
                                                    <img src={user.avatar || '/placeholder.svg'} alt={user.username} className="h-8 w-8 rounded-full object-cover" />
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{user.username}</p>
                                                        <p className="text-xs text-gray-400">{user.useremail}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {showDropdown && searchQuery && searchResults.length === 0 && !isLoading && (
                                        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-600 bg-[#2a2a2a] p-3 text-center shadow-lg">
                                            <p className="text-sm text-gray-400">No users found</p>
                                        </div>
                                    )}

                                    {isLoading && (
                                        <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Selected user */}
                            {selectedUsers.length > 0 && (
                                <div className="mt-4">
                                    <p className="mb-2 text-sm font-medium text-gray-200">Selected:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedUsers.map(user => (
                                            <div key={user.id} className="flex items-center gap-1 rounded-full bg-[#4a4a4a] py-1 pr-2 pl-1 text-sm text-white">
                                                <img src={user.avatar || '/placeholder.svg'} alt={user.username} className="h-5 w-5 rounded-full object-cover" />
                                                <span>{user.username}</span>
                                                <button onClick={() => handleRemoveUser(user.id)} className="ml-1 rounded-full p-0.5 hover:bg-[#5a5a5a]">
                                                    <X className="h-3 w-3" />
                                                    <span className="sr-only">Remove</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Group Chat Content */}
                    {activeTab === 'group' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="group-name" className="text-sm font-medium text-gray-200">
                                    Group Name
                                </label>
                                <input
                                    id="group-name"
                                    type="text"
                                    placeholder="Enter group name"
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)}
                                    className="w-full rounded-md border border-gray-600 bg-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-gray-400 shadow-sm transition-colors focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="group-email-search" className="text-sm font-medium text-gray-200">
                                    Add members by email
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        id="group-email-search"
                                        type="text"
                                        placeholder="Enter email address"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full rounded-md border border-gray-600 bg-[#2a2a2a] px-3 py-2 pl-10 text-sm text-white placeholder-gray-400 shadow-sm transition-colors focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none"
                                    />

                                    {showDropdown && searchResults.length > 0 && (
                                        <div ref={dropdownRef} className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-600 bg-[#2a2a2a] shadow-lg">
                                            {searchResults.map(user => (
                                                <div
                                                    key={user.id}
                                                    className="flex cursor-pointer items-center gap-3 border-b border-gray-600 p-2 last:border-b-0 hover:bg-[#3a3a3a]"
                                                    onClick={() => handleSelectUser(user)}
                                                >
                                                    <img src={user.avatar || '/placeholder.svg'} alt={user.username} className="h-8 w-8 rounded-full object-cover" />
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{user.useremail}</p>
                                                        <p className="text-xs text-gray-400">{user.useremail}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {showDropdown && searchQuery && searchResults.length === 0 && !isLoading && (
                                        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-600 bg-[#2a2a2a] p-3 text-center shadow-lg">
                                            <p className="text-sm text-gray-400">No users found</p>
                                        </div>
                                    )}

                                    {isLoading && (
                                        <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Selected users */}
                            {selectedUsers.length > 0 && (
                                <div className="mt-4">
                                    <p className="mb-2 text-sm font-medium text-gray-200">Group members ({selectedUsers.length}):</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedUsers.map(user => (
                                            <div key={user.id} className="flex items-center gap-1 rounded-full bg-[#4a4a4a] py-1 pr-2 pl-1 text-sm text-white">
                                                <img src={user.avatar || '/placeholder.svg'} alt={user.username} className="h-5 w-5 rounded-full object-cover" />
                                                <span>{user.username}</span>
                                                <button onClick={() => handleRemoveUser(user.id)} className="ml-1 rounded-full p-0.5 hover:bg-[#5a5a5a]">
                                                    <X className="h-3 w-3" />
                                                    <span className="sr-only">Remove</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Action buttons */}
            <div className="mt-auto flex justify-end gap-3 pt-4">
                <button
                    onClick={onClose}
                    className="rounded-md border border-gray-500 bg-transparent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#3a3a3a] focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-[#212121] focus:outline-none"
                >
                    Cancel
                </button>
                <button
                    onClick={handleCreateConversation}
                    disabled={isCreateButtonDisabled}
                    className={`rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#212121] focus:outline-none ${
                        isCreateButtonDisabled ? 'cursor-not-allowed bg-gray-600' : 'bg-[#757575] hover:bg-[#8a8a8a] focus:ring-gray-400'
                    }`}
                >
                    Create
                </button>
            </div>
        </div>
    )
}

export default ConversationCreatorPopUp
