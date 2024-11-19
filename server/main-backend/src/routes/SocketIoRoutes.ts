import { Server } from 'socket.io';
import logging from '../config/logging';
import ProjectsServices from '../services/ProjectsServices/ProjectsServices';
import { Pool } from 'pg';

const NAMESPACE = 'SocketIO';

const initSorketioRoutes = (io: Server, pool: Pool) => {
    io.on('connection', (socket) => {


        socket.on('join-repo', (data) => {
            ProjectsServices.joinRepo(socket, pool, data);
        });

        socket.on('start-service', (data: { processId?: string }) => {
            ProjectsServices.startService(socket);
        });

        socket.on('stop-service', (data: { processId: string }) => {
            ProjectsServices.stopService(socket, data);
        });

        // Clean up processes when client disconnects
        socket.on('disconnect', () => {
            ProjectsServices.cleanupSocketProcesses(socket);
        });
    });
};

export default { initSorketioRoutes };
