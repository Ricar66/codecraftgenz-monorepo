/**
 * Custom Application Error
 * Used for consistent error handling across the application
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    // Maintains proper stack trace for where the error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  // Factory methods for common errors
  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Não autorizado'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Acesso negado'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(resource = 'Recurso'): AppError {
    return new AppError(404, 'NOT_FOUND', `${resource} não encontrado`);
  }

  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }

  static validationError(message: string, details?: unknown): AppError {
    return new AppError(422, 'VALIDATION_ERROR', message, details);
  }

  static internal(message = 'Erro interno do servidor'): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }

  static tooManyRequests(message = 'Muitas requisições'): AppError {
    return new AppError(429, 'TOO_MANY_REQUESTS', message);
  }

  /**
   * Serialize error to JSON
   */
  toJSON(): { code: string; message: string; details?: unknown } {
    const json: { code: string; message: string; details?: unknown } = {
      code: this.code,
      message: this.message,
    };

    if (this.details !== undefined) {
      json.details = this.details;
    }

    return json;
  }
}
