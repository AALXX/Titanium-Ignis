import { Pool } from 'pg'
import { Server, Socket } from 'socket.io'
import { connect, query } from '../config/postgresql'
import { Message, MessageReq } from '../types/MessagesTypes'
import logging from '../config/logging'
import { v4 as uuidv4 } from 'uuid'
import { checkForPermissions, CreateToken, getUserPrivateTokenFromPublicToken, getUserPrivateTokenFromSessionToken, getUserPublicTokenFromSessionToken } from '../utils/utils'
import { SCYconnect, SCYquery } from '../config/scylla'
import { redisClient } from '../config/redis'

const GetAllConversations = async (pool: Pool, socket: Socket, userSessionToken: string) => {
    const connection = await connect(pool)
    try {
        if (!connection) {
            return socket.emit('GET_ALL_CONVERSATIONS', {
                error: true,
                message: 'Error connecting to PostgreSQL'
            })
        }

        const [userToken, userPublicToken] = await Promise.all([getUserPrivateTokenFromSessionToken(connection, userSessionToken), getUserPublicTokenFromSessionToken(connection, userSessionToken)])

        if (!userToken || !userPublicToken) {
            connection.release()
            return socket.emit('GET_ALL_CONVERSATIONS', {
                error: true,
                message: 'User not found'
            })
        }


        const [conversationsAsP1, conversationsAsP2, onlineUsers] = await Promise.all([
            SCYquery(`SELECT id, chatToken, person1_token, person2_token FROM Conversations_by_person1_token WHERE person1_token = ?`, [userToken]),
            SCYquery(`SELECT id, chatToken, person1_token, person2_token FROM Conversations_by_person2_token WHERE person2_token = ?`, [userToken]),
            redisClient.sMembers('online_users')
        ])

        
        const allConversationsRaw = [...conversationsAsP1, ...conversationsAsP2]

        // Remove duplicate conversations by chatToken
        const uniqueMap = new Map<string, any>()
        for (const conv of allConversationsRaw) {
            if (!uniqueMap.has(conv.chattoken)) {
                uniqueMap.set(conv.chattoken, conv)
            }
        }
        const allConversations = Array.from(uniqueMap.values())

        const otherTokensSet = new Set<string>()
        for (const conv of allConversations) {
            const otherToken: string = conv.person1_token === userToken ? conv.person2_token : conv.person1_token
            if (otherToken !== userToken) otherTokensSet.add(otherToken) // skip self-conversations
        }
        const otherTokens = [...otherTokensSet]

        // Fetch usernames and public tokens
        let usersMap = new Map<string, { username: string; userpublictoken: string }>()
        if (otherTokens.length > 0) {
            const placeholders = otherTokens.map((_, i) => `$${i + 1}`).join(',')
            const userResults = await query(connection, `SELECT UserName, UserPublicToken, UserPrivateToken FROM users WHERE UserPrivateToken IN (${placeholders})`, otherTokens)
            for (const row of userResults) {
                usersMap.set(row.userprivatetoken, {
                    username: row.username,
                    userpublictoken: row.userpublictoken
                })
            }
        }

        const onlineUsersSet = new Set(onlineUsers)

        // Filter and enrich conversations
        const enrichedConversations = allConversations
            .map(conv => {
                const otherToken = conv.person1_token === userToken ? conv.person2_token : conv.person1_token
                const userInfo = usersMap.get(otherToken)
                if (!userInfo || userInfo.userpublictoken === userPublicToken) return null

                return {
                    id: conv.id,
                    chatToken: conv.chattoken,
                    otherPersonName: userInfo.username,
                    otherPersonPublicToken: userInfo.userpublictoken,
                    isOnline: onlineUsersSet.has(userInfo.userpublictoken)
                }
            })
            .filter(Boolean) // Remove nulls

        connection.release()

        return socket.emit('ALL_CONVERSATIONS', {
            error: false,
            conversations: enrichedConversations
        })
    } catch (error) {
        connection?.release()
        console.error('GET_ALL_CONVERSATIONS error:', error)
        return socket.emit('ALL_CONVERSATIONS', {
            error: true,
            message: 'Failed to get conversations'
        })
    }
}

const CreateConversation = async (pool: Pool, socket: Socket, userSessionToken: string, person2PublicToken: string) => {
    try {
        const connection = await connect(pool!)

        const person2Token = await getUserPrivateTokenFromSessionToken(connection!, userSessionToken)
        const person1Token = await getUserPrivateTokenFromPublicToken(connection!, person2PublicToken)

        if (!person1Token || !person2Token) {
            console.log('User not found')
            return socket.emit('CONVERSATION_CREATED', {
                error: true,
                message: 'User not found'
            })
        }

        const SCYconnection = await SCYconnect()

        if (!SCYconnection) {
            console.log('Error connecting to ScyllaDB')
        }
        const id = uuidv4()

        const createConversation = `INSERT INTO Conversations (id, chatToken, person1_token, person2_token) VALUES (?, ?, ?, ?);`

        const chatToken = CreateToken()

        await SCYquery(createConversation, [id, chatToken, person1Token, person2Token])

        connection?.release()

        return socket.emit('CONVERSATION_CREATED', {
            error: false
        })
    } catch (error: any) {
        logging.error('REORDER_TASKS', error.message)
        socket.emit('REORDERED_TASKS', {
            error: true,
            message: 'Error reordering tasks: ' + error.message
        })
    }
}

const GetAllMessages = async (pool: Pool, socket: Socket, chatToken: string) => {
    try {
        const query = `SELECT * FROM messages WHERE chatToken = ?`
        await SCYconnect()

        const result = await SCYquery(query, [chatToken])

        return socket.emit('ALL_MESSAGES', {
            error: false,
            messages: result
        })
    } catch (error) {
        console.error('GET_ALL_MESSAGES error:', error)
        return socket.emit('ALL_MESSAGES', {
            error: true,
            message: 'Failed to get messages'
        })
    }
}

const SendMessage = async (pool: Pool, socket: Socket, chatToken: string, message: Omit<MessageReq, 'senderPublicToken'>, userSessionToken: string) => {
    try {
        const connection = await connect(pool!)
        const userToken = await getUserPublicTokenFromSessionToken(connection!, userSessionToken)

        if (!userToken) {
            return socket.emit('SEND_MESSAGE', {
                error: true,
                message: 'User not found'
            })
        }

        const formattedAttachments =
            message.attachments?.map(att => ({
                type: att.type,
                url: att.url,
                name: att.name,
                size: att.size?.toString()
            })) || []

        const cassandraAttachments = formattedAttachments.map(att => ({
            type: att.type,
            url: att.url,
            name: att.name,
            size: att.size?.toString()
        }))

        const fullMessage: Message = {
            content: message.content,
            senderpublictoken: userToken,
            attachments: formattedAttachments,
            timesent: new Date()
        }

        const messageId = uuidv4()

        const query = `
        INSERT INTO messages (id, chatToken, senderPublicToken, content, attachments, timeSent)
        VALUES (?, ?, ?, ?, ?, ?)
      `

        await SCYquery(query, [messageId, chatToken, userToken, message.content, cassandraAttachments, fullMessage.timesent])

        socket.to(chatToken).emit('NEW_MESSAGE', {
            error: false,
            message: fullMessage
        })
    } catch (error) {
        console.error('SEND_MESSAGE error:', error)
        return socket.emit('SEND_MESSAGE', {
            error: true,
            message: 'Failed to send message'
        })
    }
}

export default { CreateConversation, GetAllConversations, GetAllMessages, SendMessage }
