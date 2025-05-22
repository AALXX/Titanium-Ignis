import { z } from 'zod'

export const ConnectSocketSchema = z.object({
    userSessionToken: z.string().min(1)
})

export const DisconnectSocketSchema = z.object({
    userSessionToken: z.string().min(1)
})

export const GetAllConversationsSchema = z.object({
    userSessionToken: z.string().min(1)
})

export const JoinMessageRoomSchema = z.object({
    chatToken: z.string().min(1),
    userSessionToken: z.string().min(1)
})

export const CreateConversationSchema = z.object({
    userSessionToken: z.string().min(1),
    person2PublicToken: z.string().min(1)
})

export const SendMessageSchema = z.object({
    chatToken: z.string().min(1),
    userSessionToken: z.string().min(1),
    message: z
        .object({
            content: z.string().max(1000),
            senderpublictoken: z.string().min(1),
            attachments: z
                .array(
                    z.object({
                        type: z.enum(['image', 'file']),
                        url: z.string().url(),
                        name: z.string(),
                        size: z.number().optional()
                    })
                )
                .optional()
        })
        .refine(msg => msg.content.length > 0 || (msg.attachments && msg.attachments.length > 0), {
            message: 'Message content must not be empty if no attachments are present'
        })
})