import express from 'express'
import multer from 'multer'
import path from 'path'
import { Server } from 'socket.io'
import http from 'http'
import config from './config/config'
import logging from './config/logging'
import MessaggesService from './services/Messagges'
import { connect, createPool } from './config/postgresql'
import { GetAllConversationsSchema, JoinMessageRoomSchema, CreateConversationSchema, SendMessageSchema, ConnectSocketSchema, DisconnectSocketSchema } from './validators/socketSchemas'
import { getUserPrivateTokenFromSessionToken, getUserPublicTokenFromPrivateToken, getUserPublicTokenFromSessionToken } from './utils/utils'
import fs from 'fs'
import { Request, Response } from 'express'
import { v4 } from 'uuid'
import cors from 'cors'
import { connectRedis, redisClient } from './config/redis'

const NAMESPACE = 'MESSAGEING_API'
const pool = createPool()

try {
    ;(async () => {
        await connectRedis()
    })()

    logging.info(NAMESPACE, 'Connected to REDIS')
} catch (error) {
    logging.error(NAMESPACE, 'Error connecting to REDIS:', error)
}

const app = express()

app.use(
    cors({
        origin: ['http://localhost:3000'],
        credentials: true
    })
)

if (!fs.existsSync(process.env.MESSAGES_FOLDER_PATH!)) {
    fs.mkdirSync(process.env.MESSAGES_FOLDER_PATH!)
}

interface ExtendedRequest extends Request {
    filenameMap?: Record<string, string>
}

const storage = multer.diskStorage({
    destination: process.env.MESSAGES_FOLDER_PATH!,

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname)
        const baseName = v4()
        const safeName = `${baseName}${extension}`

        if (!(req as ExtendedRequest).filenameMap) {
            ;(req as ExtendedRequest).filenameMap = {}
        }
        ;(req as ExtendedRequest).filenameMap![file.originalname] = safeName

        cb(null, safeName)
    }
})

const upload = multer({ storage })

app.post('/upload', upload.array('files', 10), (req: Request, res: Response): void => {
    const files = req.files as Express.Multer.File[]
    const filenameMap = (req as ExtendedRequest).filenameMap || {}

    if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' })
        return
    }

    const uploadedFiles = files.map(file => {
        const generatedName = filenameMap[file.originalname] || file.filename
        return {
            url: `http://${process.env.FILES_SERVER}:${process.env.FILES_SERVER_PORT}/messages/${generatedName}`
        }
    })
    console.log(uploadedFiles)
    res.json(uploadedFiles)
})

const httpServer = http.createServer(app)
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:3000']
    }
})

io.on('connection', socket => {
    socket.on('user-connected', data => {
        const parsed = ConnectSocketSchema.safeParse(data)
        if (!parsed.success) return socket.emit('error', { error: 'Invalid input' })
        ;(async () => {
            try {
                const connection = await connect(pool!)
                const userPublicToken = await getUserPublicTokenFromSessionToken(connection!, parsed.data.userSessionToken)

                if (!userPublicToken) {
                    return socket.emit('USER_ONLINE', {
                        error: true,
                        message: 'User not found'
                    })
                }

                await redisClient.sAdd('online_users', userPublicToken)

                const onlineUsers = await redisClient.sMembers('online_users')

                console.log(onlineUsers)
                socket.emit('USER_ONLINE', {
                    error: false,
                    userPublicToken,
                    onlineUsers
                })

                connection?.release()
            } catch (error) {
                console.error('USER_ONLINE error:', error)
                return socket.emit('USER_ONLINE', {
                    error: true,
                    message: 'Failed to get messages'
                })
            }
        })()
    })

    socket.on('get-all-conversations', data => {
        const parsed = GetAllConversationsSchema.safeParse(data)
        if (!parsed.success) return socket.emit('error', { error: 'Invalid input' })
        return MessaggesService.GetAllConversations(pool, socket, parsed.data.userSessionToken)
    })

    socket.on('join-message-room', data => {
        const parsed = JoinMessageRoomSchema.safeParse(data)
        if (!parsed.success) return socket.emit('error', { error: 'Invalid input' })
        socket.join(parsed.data.chatToken)
        ;(async () => {
            try {
                const connection = await connect(pool!)
                const userPublicToken = await getUserPublicTokenFromSessionToken(connection!, parsed.data.userSessionToken)

                if (!userPublicToken) {
                    return socket.emit('JOIN_MESSAGE_ROOM', {
                        error: true,
                        message: 'User not found'
                    })
                }

                socket.emit('JOINED_ROOM', {
                    error: false,
                    userPublicToken
                })

                connection?.release()
            } catch (error) {
                console.error('JOIN_MESSAGE_ROOM error:', error)
                return socket.emit('JOIN_MESSAGE_ROOM', {
                    error: true,
                    message: 'Failed to get messages'
                })
            }
        })()

        return MessaggesService.GetAllMessages(pool, socket, parsed.data.chatToken)
    })

    socket.on('create-conversation', data => {
        const parsed = CreateConversationSchema.safeParse(data)
        if (!parsed.success) return socket.emit('error', { error: 'Invalid input' })
        return MessaggesService.CreateConversation(pool, socket, parsed.data.userSessionToken, parsed.data.person2PublicToken)
    })

    socket.on('send-message', data => {
        const parsed = SendMessageSchema.safeParse(data)
        if (!parsed.success) {
            return socket.emit('error', { error: 'Invalid input' })
        }

        const { chatToken, userSessionToken, message } = parsed.data
        return MessaggesService.SendMessage(pool, socket, chatToken, message, userSessionToken)
    })

    socket.on('user-disconnected', data => {
        const parsed = DisconnectSocketSchema.safeParse(data)
        if (!parsed.success) return socket.emit('error', { error: 'Invalid input' })
        ;(async () => {
            try {
                const connection = await connect(pool!)
                const userPublicToken = await getUserPublicTokenFromSessionToken(connection!, parsed.data.userSessionToken)
                if (!userPublicToken) {
                    return socket.emit('USER_OFFLINE', {
                        error: true,
                        message: 'User not found'
                    })
                }

                await redisClient.sRem('online_users', userPublicToken)
                const onlineUsers = await redisClient.sMembers('online_users')
                socket.emit('USER_OFFLINE', {
                    error: false,
                    userPublicToken
                })

                connection?.release()
            } catch (error) {
                console.error('USER_OFFLINE error:', error)
                return socket.emit('USER_OFFLINE', {
                    error: true,
                    message: 'Failed to get messages'
                })
            }
        })()
    })

    socket.on('disconnect', () => {})
})

httpServer.listen(config.server.port, () => {
    logging.info(NAMESPACE, `API is running at http://${config.server.hostname}:${config.server.port}`)
})
