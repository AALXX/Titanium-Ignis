import { z } from 'zod'

export const GetAllConversationsSchema = z.object({
    userSessionToken: z.string().min(1)
})

export const JoinMessageRoomSchema = z.object({
    chatToken: z.string().min(1)
})

export const CreateConversationSchema = z.object({
    userSessionToken: z.string().min(1),
    person2PublicToken: z.string().min(1)
})

export const SendMessageSchema = z.object({
    chatToken: z.string().min(1),
    userSessionToken: z.string().min(1),
    message: z.object({
        content: z.string().min(1).max(1000),
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
})