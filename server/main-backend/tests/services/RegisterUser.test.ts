import { Request, Response } from 'express';
import { CustomRequest } from '../../src/config/postgresql';
import UserAccountServices from '../../src/services/UserAccountServices/UserAccountServices';
import * as utilFunctions from '../../src/util/utilFunctions';
import { MockPool } from '../utils/mockDatabase';

// Mock utility functions
jest.mock('../../src/util/utilFunctions', () => ({
    CreateToken: jest.fn().mockReturnValue('mock-private-token'),
    CreateSesionToken: jest.fn().mockReturnValue('mock-public-token'),
    HashPassword: jest.fn().mockResolvedValue('hashed-password'),
    generateSecurePassword: jest.fn().mockReturnValue('secure-password'),
}));

describe('RegisterUser Service', () => {
    let mockPool: MockPool;
    let mockReq: Partial<CustomRequest>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockPool = new MockPool();

        mockReq = {
            pool: mockPool as any,
            body: {
                userName: 'Test User',
                userEmail: 'test@example.com',
                password: 'testpassword',
                registrationType: 'credentials',
                userSessionToken: 'session-token',
            },
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    // TODO implement
    // test('Register new user with credentials', async () => {
    //     // Setup mock for no existing user
    //     (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    //     // Setup mock for insert query
    //     (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    //     await UserAccountServices.RegisterUser(mockReq as CustomRequest, mockRes as Response);

    //     // Verify response
    //     expect(mockRes.status).toHaveBeenCalledWith(200);
    //     expect(mockRes.json).toHaveBeenCalledWith(
    //         expect.objectContaining({
    //             error: false,
    //             userPrivateToken: 'mock-private-token',
    //             userPublicToken: 'mock-public-token',
    //         }),
    //     );

    //     // Verify utility function calls
    //     expect(utilFunctions.default.HashPassword).toHaveBeenCalledWith('testpassword');
    // });

    test('Register existing user with credentials', async () => {
        // Setup mock for existing user
        (mockPool.query as jest.Mock).mockResolvedValueOnce({
            rows: [
                {
                    useremail: 'test@example.com',
                    userpwd: 'existing-hashed-password',
                },
            ],
        });

        // Setup mock for update query
        (mockPool.query as jest.Mock).mockResolvedValueOnce({
            rows: [
                {
                    userprivatetoken: 'existing-private-token',
                    userpublictoken: 'existing-public-token',
                },
            ],
        });

        await UserAccountServices.RegisterUser(mockReq as CustomRequest, mockRes as Response);

        // Verify response
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: false,
            }),
        );
    });

    test('Invalid registration type', async () => {
        mockReq.body.registrationType = 'invalid-type';

        await UserAccountServices.RegisterUser(mockReq as CustomRequest, mockRes as Response);

        // Verify response for invalid registration type
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: true,
                errmsg: 'Invalid registration type',
            }),
        );
    });
});
