import { Pool } from 'pg'
import { Server, Socket } from 'socket.io'
import { connect, query } from '../config/postgresql'
import { ContainerState, ITasks } from '../types/TaskTypes'
import logging from '../config/logging'
import { v4 as uuidv4 } from 'uuid'
import { checkForPermissions, getUserPrivateTokenFromSessionToken, getUserPublicTokenFromSessionToken } from '../utils/utils'
import { SCYconnect } from '../config/scylla'

const CreateMessageRoom = async(pool: Pool, socket: Socket, io: Server, userSessionToken: string, projectToken: string) => {
    try {
        const connection = await connect(pool)
        
        const SCYconnection = await SCYconnect()

        
    } catch (error: any) {
        logging.error('REORDER_TASKS', error.message)
        socket.emit('REORDERED_TASKS', {
            error: true,
            message: 'Error reordering tasks: ' + error.message
        })
    }
}
