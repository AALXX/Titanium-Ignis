import { Socket } from 'socket.io';
import { Pool } from 'pg';
import ProjectsServices from '../../src/services/ProjectsServices/ProjectsServices';
import * as postgresql from '../../src/config/postgresql';
import * as utilFunctions from '../../src/util/utilFunctions';
import { Response } from 'express';
import { CustomRequest } from '../../src/config/postgresql';
import fs from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('../../src/config/postgresql');
jest.mock('../../src/util/utilFunctions');
jest.mock('child_process', () => ({
    spawn: jest.fn(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
    })),
}));

describe('ProjectsServices', () => {
    let mockConnection: any;
    let mockPool: Pool;
    let mockSocket: Partial<Socket>;
    let mockReq: Partial<CustomRequest>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup mock connection
        mockConnection = {
            query: jest.fn(),
            release: jest.fn(),
        };

        // Setup mock pool
        mockPool = {} as Pool;

        // Setup mock socket
        mockSocket = {
            emit: jest.fn(),
        };

        // Setup mock request and response
        mockReq = {
            pool: mockPool,
            params: {
                userSessionToken: 'test-session-token',
                projectToken: 'test-project-token',
            },
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        // Mock postgresql connect and query
        (postgresql.connect as jest.Mock).mockResolvedValue(mockConnection);
        (postgresql.query as jest.Mock).mockResolvedValue([
            {
                project_name: 'Test Project',
                project_token: 'test-project-token',
                repo_url: 'https://example.com',
                checked_out_by: 'user-private-token',
                status: 'active',
                type: 'web',
            },
        ]);

        // Mock process.env
        process.env.REPOSITORIES_FOLDER_PATH = '../repos';

        // Mock fs.readFileSync
        (fs.readFileSync as jest.Mock).mockReturnValue(
            JSON.stringify({
                services: [
                    {
                        name: 'test-service',
                        path: './test',
                        'custom-commands': {
                            install: 'npm install',
                        },
                        'start-command': 'npm run dev',
                        port: 3000,
                    },
                ],
            }),
        );
    });

    describe('getAllProjects', () => {
        test('should retrieve projects successfully', async () => {
            // Mock user private token retrieval
            (utilFunctions.default.getUserPrivateTokenFromSessionToken as jest.Mock).mockResolvedValue('user-private-token');

            // Mock query result
            (postgresql.query as jest.Mock).mockResolvedValue([
                {
                    project_name: 'Test Project',
                    project_token: 'test-token',
                    repo_url: 'https://example.com',
                    checked_out_by: 'user-private-token',
                    status: 'active',
                    type: 'web',
                },
            ]);

            await ProjectsServices.getAllProjects(mockReq as CustomRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: false,
                    projects: expect.any(Array),
                }),
            );
        });

        test('should handle errors', async () => {
            // Simulate error in retrieval
            (utilFunctions.default.getUserPrivateTokenFromSessionToken as jest.Mock).mockRejectedValue(new Error('Test error'));

            await ProjectsServices.getAllProjects(mockReq as CustomRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: true,
                    errmsg: 'Test error',
                }),
            );
        });
    });

    describe('getProjectData', () => {
        test('should retrieve project data successfully', async () => {
            // Mock query result
            (postgresql.query as jest.Mock).mockResolvedValue([
                {
                    project_name: 'Test Project',
                    project_token: 'test-token',
                    repo_url: 'https://example.com',
                    checked_out_by: 'user-private-token',
                    status: 'active',
                    type: 'git',
                },
            ]);

            await ProjectsServices.getProjectData(mockReq as CustomRequest, mockRes as Response);

            expect(fs.readFileSync).toHaveBeenCalledWith('../repos/test-project-token/project-config.json', 'utf8');

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: false,
                    project: expect.objectContaining({
                        ProjectName: '',
                        RepoUrl: '',
                        CheckedOutBy: '',
                        Status: '',
                        Type: '',
                        ProjectConfig: '',
                    }),
                }),
            );
        });

        test('should handle file read errors', async () => {
            // Simulate file read error
            (fs.readFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('File not found');
            });

            await ProjectsServices.getProjectData(mockReq as CustomRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: true,
                    errmsg: 'File not found',
                }),
            );
        });
    });

    describe('startService', () => {
        test('should start a service and emit events', async () => {
            const { spawn } = require('child_process');
            await ProjectsServices.startService(mockSocket as Socket);

            expect(spawn).toHaveBeenCalledWith('ping', ['google.com']);
            expect(mockSocket.emit).toHaveBeenCalledWith('service-started', expect.objectContaining({ processId: expect.any(String) }));
        });
    });

    describe('stopService', () => {
        test('should stop an existing service', async () => {
            // Simulate an active process
            const mockProcess = {
                kill: jest.fn(),
            };
            const activeProcesses = new Map();
            activeProcesses.set('test-process-id', mockProcess);

            // Temporarily replace the internal Map
            const originalGet = Map.prototype.get;
            Map.prototype.get = jest.fn(() => mockProcess);

            await ProjectsServices.stopService(mockSocket as Socket, { processId: 'test-process-id' });

            expect(mockProcess.kill).toHaveBeenCalled();
            expect(mockSocket.emit).toHaveBeenCalledWith('service-stopped', { processId: 'test-process-id' });

            // Restore original Map.get
            Map.prototype.get = originalGet;
        });
    });
});
