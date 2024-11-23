import { Socket } from 'socket.io';
import { Pool } from 'pg';
import ProjectsServices from '../../src/services/ProjectsServices/ProjectsServices';
import * as postgresql from '../../src/config/postgresql';
import * as utilFunctions from '../../src/util/utilFunctions';
import { Response } from 'express';
import { CustomRequest } from '../../src/config/postgresql';
import fs from 'fs';

// Mock dependencies

jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashedPassword'),
    compare: jest.fn().mockResolvedValue(true),
}));

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
                id: 0,
                name: 'test-service',
                path: './test',
                'custom-commands': {
                    install: 'npm install',
                },
                'start-command': 'npm run dev',
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

        process.env.REPOSITORIES_FOLDER_PATH = '../repos';
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

            expect(fs.readFileSync).toHaveBeenCalledWith('../repos/test-project-token/project-config.json', 'utf8');

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
});
