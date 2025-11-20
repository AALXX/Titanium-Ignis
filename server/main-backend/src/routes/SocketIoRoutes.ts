import { Server } from 'socket.io';
import logging from '../config/logging';
import ProjectCodeBaseServices from '../services/ProjectsServices/ProjectCodeBaseServices';
import ProjectCodeBaseDeployments from '../services/ProjectsServices/ProjectCodeBaseDeployments';

import { Pool } from 'pg';

const NAMESPACE = 'SocketIO';

const initSorketioRoutes = (io: Server, pool: Pool) => {
    io.on('connection', (socket) => {
        socket.on('join-repo', (data) => {
            ProjectCodeBaseServices.joinRepo(socket, pool, data);
        });

        socket.on('start-service', (data: { userSessionToken: string; projectToken: string; serviceID: number }) => {
            ProjectCodeBaseServices.startService(socket, data.userSessionToken, data.projectToken, data.serviceID);
        });

        socket.on('stop-service', (data: { projectToken: string; processId: string }) => {
            ProjectCodeBaseServices.stopService(socket, data);
        });

        socket.on('start-setup', (data: { userSessionToken: string; projectToken: string; serviceID: number }) => {
            ProjectCodeBaseServices.startSetup(socket, data.userSessionToken, data.projectToken, data.serviceID);
        });

        // Clean up processes when client disconnects
        socket.on('disconnect', () => {
            // ProjectsServices.cleanupSocketProcesses(socket);
        });
    });
};

export default { initSorketioRoutes };
