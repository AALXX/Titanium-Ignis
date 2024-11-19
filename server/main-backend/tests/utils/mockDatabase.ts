export class MockPool {
    private mockData: { [key: string]: any[] } = {};

    connect = jest.fn(() => ({
        query: this.query,
        release: jest.fn(),
    }));

    query = jest.fn((text: string, params: any[]) => {
        const key = this.generateMockKey(text, params);
        return Promise.resolve({ rows: this.mockData[key] || [] });
    });

    setMockData(query: string, params: any[], data: any[]) {
        const key = this.generateMockKey(query, params);
        this.mockData[key] = data;
    }

    private generateMockKey(text: string, params: any[]): string {
        return `${text}-${params.join(',')}`;
    }
}

// Mock the connection and query functions
jest.mock('../../src/config/postgresql.ts', () => ({
    ...jest.requireActual('../../src/config/postgresql.ts'),
    connect: jest.fn(() => ({
        query: jest.fn(),
        release: jest.fn(),
    })),
    query: jest.fn(),
}));
