import { Socket } from 'socket.io';
import { Pool } from 'pg';
import ProjectsServices from '../../src/services/ProjectsServices/ProjectsServices';
import * as postgresql from '../../src/config/postgresql';
import * as utilFunctions from '../../src/util/utilFunctions';
import { Response } from 'express';
import { CustomRequest } from '../../src/config/postgresql';
import fs from 'fs';
import { spawn } from 'child_process';

// Mock the entire fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashedPassword'),
    compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('fs');
jest.mock('../../src/config/postgresql');
jest.mock('../../src/util/utilFunctions');
jest.mock('child_process', () => ({
    spawn: jest.fn((command, args, options) => {
        return {
            stdout: { 
                on: jest.fn((event, callback) => {
                    if (event === 'data') callback(Buffer.from('test output'));
                })
            },
            stderr: { 
                on: jest.fn((event, callback) => {
                    if (event === 'data') callback(Buffer.from('test error'));
                })
            },
            on: jest.fn((event, callback) => {
                if (event === 'close') callback(0);
                if (event === 'error') callback(new Error('Spawn error'));
            }),
            kill: jest.fn(),
        };
    }),
}));

describe('ProjectsServices', () => {
    let mockConnection: any;
    let mockPool: Pool;
    let mockSocket: Partial<Socket>;
    let mockReq: Partial<CustomRequest>;
    let mockRes: Partial<Response>;

    let mockChildProcess: {
        stdout: { on: jest.Mock };
        stderr: { on: jest.Mock };
        on: jest.Mock;
        kill: jest.Mock;
    };

    const mockProjectData = {
        project_name: 'Test Project',
        project_token: 'test-project-token',
        repo_url: 'https://example.com',
        checked_out_by: 'user-private-token',
        status: 'active',
        type: 'web',
    };

    const mockProjectConfig = {
        services: [
            {
                id: 1,
                name: 'test-service',
                'start-command': 'npm run dev',
                dir: '/test',
                port: 3000,
            },
        ],
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockConnection = {
            query: jest.fn(),
            release: jest.fn(),
        };

        mockPool = {} as Pool;

        mockSocket = {
            emit: jest.fn(),
        };

        mockChildProcess = {
            stdout: { on: jest.fn() },
            stderr: { on: jest.fn() },
            on: jest.fn(),
            kill: jest.fn(),
        };

        (spawn as jest.Mock).mockReturnValue(mockChildProcess);

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

        // Setup default mocks
        (postgresql.connect as jest.Mock).mockResolvedValue(mockConnection);
        (postgresql.query as jest.Mock).mockResolvedValue([mockProjectData]);
        (utilFunctions.default.getUserPrivateTokenFromSessionToken as jest.Mock).mockResolvedValue('user-private-token');
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockProjectConfig));

        process.env.PROJECTS_FOLDER_PATH = '../projects';
    });

    describe('getAllProjects', () => {
        test('should retrieve projects successfully', async () => {
            await ProjectsServices.getAllProjects(mockReq as CustomRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: false,
                projects: [
                    {
                        ProjectName: mockProjectData.project_name,
                        ProjectToken: mockProjectData.project_token,
                        RepoUrl: mockProjectData.repo_url,
                        CheckedOutBy: mockProjectData.checked_out_by,
                        Status: mockProjectData.status,
                        Type: mockProjectData.type,
                    },
                ],
            });
        });

        test('should handle errors', async () => {
            const testError = new Error('Test error');
            (utilFunctions.default.getUserPrivateTokenFromSessionToken as jest.Mock).mockRejectedValue(testError);

            await ProjectsServices.getAllProjects(mockReq as CustomRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: true,
                errmsg: 'Test error',
            });
        });
    });

    describe('getProjectData', () => {
        test('should retrieve project data successfully', async () => {
            await ProjectsServices.getProjectData(mockReq as CustomRequest, mockRes as Response);

            mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockProjectConfig));

            expect(mockedFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('project-config.json'), 'utf8');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: false,
                project: {
                    ProjectName: mockProjectData.project_name,
                    RepoUrl: mockProjectData.repo_url,
                    CheckedOutBy: mockProjectData.checked_out_by,
                    Status: mockProjectData.status,
                    Type: mockProjectData.type,
                    ProjectConfig: mockProjectConfig,
                },
            });
        });

        test('should handle file read errors', async () => {
            const fileError = new Error('File not found');
            (fs.readFileSync as jest.Mock).mockImplementation(() => {
                throw fileError;
            });

            await ProjectsServices.getProjectData(mockReq as CustomRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: true,
                errmsg: 'File not found',
            });
        });
    });

    describe('startService', () => {
        test('should start a service successfully', async () => {
            

            const mockSocketEmit = jest.fn();
            mockSocket.emit = mockSocketEmit;

            await ProjectsServices.startService(mockSocket as Socket, 'user-session-token', 'test-project-token', 1);

            // Check that the service was started successfully
            expect(mockSocketEmit).toHaveBeenCalledWith('service-started', expect.objectContaining({ processId: expect.any(String) }));
            expect(mockSocketEmit).toHaveBeenCalledWith('service-output', expect.objectContaining({ output: 'test output' }));
        });

        test('should handle invalid service ID', async () => {
            
            const mockSocketEmit = jest.fn();
            mockSocket.emit = mockSocketEmit;

            await ProjectsServices.startService(
                mockSocket as Socket,
                'user-session-token',
                'test-project-token',
                2, // Invalid service ID
            );

            // Check that an error was emitted for an invalid service ID
            expect(mockSocketEmit).toHaveBeenCalledWith('service-error', {
                error: true,
                errmsg: 'Invalid service ID',
            });
        });

        test('should handle service start error', async () => {
            // Mock a valid project configuration
            (fs.readFileSync as jest.Mock).mockReturnValue(
                JSON.stringify({
                    services: [
                        {
                            id: 1,
                            name: 'test-service',
                            'start-command': 'npm run dev',
                        },
                    ],
                }),
            );

            // Simulate `spawn` throwing an error
            (spawn as jest.Mock).mockImplementation(() => {
                throw new Error('Spawn failed');
            });

            const mockSocketEmit = jest.fn();
            mockSocket.emit = mockSocketEmit;

            await ProjectsServices.startService(mockSocket as Socket, 'user-session-token', 'test-project-token', 1);

            // Check that an error was emitted for a failed service start
            expect(mockSocketEmit).toHaveBeenCalledWith('service-error', {
                error: 'Failed to start service',
            });
        });
    });
});
