import { Server } from 'socket.io'
import http from 'http'
import config from './config/config'
import logging from './config/logging'
import MessaggesService from './services/Messagges'

import { createPool } from './config/postgresql'

import { GetAllConversationsSchema, JoinMessageRoomSchema, CreateConversationSchema, SendMessageSchema } from './validators/socketSchemas'

const httpServer = http.createServer()
const NAMESPACE = 'ProjectTasks_API'

const pool = createPool()

const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:3000']
    }
})

io.on('connection', socket => {
    socket.on('get-all-conversations', data => {
        const parsed = GetAllConversationsSchema.safeParse(data)
        if (!parsed.success) return socket.emit('error', { error: 'Invalid input' })
        return MessaggesService.GetAllConversations(pool, socket, parsed.data.userSessionToken)
    })

    socket.on('join-message-room', data => {
        const parsed = JoinMessageRoomSchema.safeParse(data)
        if (!parsed.success) return socket.emit('error', { error: 'Invalid input' })
        socket.join(parsed.data.chatToken)
        return MessaggesService.GetAllMessages(pool, socket, parsed.data.chatToken)
    })

    socket.on('create-conversation', data => {
        const parsed = CreateConversationSchema.safeParse(data)
        if (!parsed.success) return socket.emit('error', { error: 'Invalid input' })
        return MessaggesService.CreateConversation(pool, socket, parsed.data.userSessionToken, parsed.data.person2PublicToken)
    })

    socket.on('send-message', data => {
        const parsed = SendMessageSchema.safeParse(data)
        console.log(data)
        if (!parsed.success) {
            return socket.emit('error', { error: 'Invalid input' })
        }

        const { chatToken, userSessionToken, message } = parsed.data
        return MessaggesService.SendMessage(pool, socket, chatToken, message, userSessionToken)
    })

    socket.on('disconnect', () => {})
})

//* Create The Api
httpServer.listen(config.server.port, () => {
    logging.info(NAMESPACE, `Api is runing on: ${config.server.hostname}:${config.server.port}`)
})
