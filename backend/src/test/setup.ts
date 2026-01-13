import { beforeAll, afterAll } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.DATABASE_URL = 'mysql://root:testpassword@localhost:3306/codecraftgenz_test';
process.env.PORT = '8081';

beforeAll(() => {
  // Global setup before all tests
});

afterAll(() => {
  // Global cleanup after all tests
});
