import { describe, it, expect } from 'vitest';
import { AppError } from './AppError.js';

describe('AppError', () => {
  it('should create an error with all properties', () => {
    const error = new AppError(400, 'VALIDATION_ERROR', 'Invalid input', {
      field: 'email',
    });

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid input');
    expect(error.details).toEqual({ field: 'email' });
    expect(error).toBeInstanceOf(Error);
  });

  describe('factory methods', () => {
    it('should create badRequest error', () => {
      const error = AppError.badRequest('Bad request');

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Bad request');
    });

    it('should create unauthorized error', () => {
      const error = AppError.unauthorized();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Não autorizado');
    });

    it('should create forbidden error', () => {
      const error = AppError.forbidden();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should create notFound error', () => {
      const error = AppError.notFound('User');

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('User não encontrado');
    });

    it('should create conflict error', () => {
      const error = AppError.conflict('Email já cadastrado');

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    it('should create internal error', () => {
      const error = AppError.internal();

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('toJSON', () => {
    it('should serialize error correctly', () => {
      const error = new AppError(400, 'TEST', 'Test message', { foo: 'bar' });
      const json = error.toJSON();

      expect(json).toEqual({
        code: 'TEST',
        message: 'Test message',
        details: { foo: 'bar' },
      });
    });

    it('should omit details if undefined', () => {
      const error = new AppError(400, 'TEST', 'Test message');
      const json = error.toJSON();

      expect(json).toEqual({
        code: 'TEST',
        message: 'Test message',
      });
      expect(json.details).toBeUndefined();
    });
  });
});
