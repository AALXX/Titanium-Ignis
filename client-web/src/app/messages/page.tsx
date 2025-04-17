import React from 'react'
import List from '@/features/messages/components/List'
import Conversation from '@/features/messages/components/Conversation'

const Messageshub = () => {
    return <div className="flex h-screen">
        <List />
        <Conversation />
    </div>
}

export default Messageshub
