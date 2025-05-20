export interface Message {
    content: string
    senderPublicToken: string
    
    attachments?: {
        type: 'image' | 'file'
        url: string
        name: string
        size?: number
    }[]
}
