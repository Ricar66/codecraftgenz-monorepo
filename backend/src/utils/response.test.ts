import { describe, it, expect } from 'vitest';
import { success, paginated } from './response.js';

describe('response utils', () => {
  describe('success', () => {
    it('should create a success response with data', () => {
      const data = { id: 1, name: 'Test' };
      const result = success(data);

      expect(result).toEqual({
        success: true,
        data: { id: 1, name: 'Test' },
      });
    });

    it('should create a success response without data', () => {
      const result = success();

      expect(result).toEqual({
        success: true,
        data: undefined,
      });
    });
  });

  describe('paginated', () => {
    it('should create a paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = paginated(data, 1, 10, 25);

      expect(result).toEqual({
        success: true,
        data: [{ id: 1 }, { id: 2 }],
        meta: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      });
    });

    it('should calculate totalPages correctly', () => {
      const result = paginated([], 1, 10, 100);

      expect(result.meta.totalPages).toBe(10);
    });

    it('should handle edge case of zero total', () => {
      const result = paginated([], 1, 10, 0);

      expect(result.meta.totalPages).toBe(0);
    });
  });
});
