import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  public statusCode: number;
  public code?: string;

  constructor(message: string, statusCode: number = 400, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Custom Application Error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code || 'APPLICATION_ERROR',
      },
    });
    return;
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      error: {
        message: 'Error de validación de datos',
        code: 'VALIDATION_ERROR',
        details: formattedErrors,
      },
    });
    return;
  }

  // 3. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') || 'campo único';
        res.status(409).json({
          success: false,
          error: {
            message: `Ya existe un registro con ese valor (${target})`,
            code: 'RECORD_CONFLICT',
          },
        });
        return;
      }
      case 'P2025': {
        res.status(404).json({
          success: false,
          error: {
            message: 'El registro solicitado no fue encontrado',
            code: 'NOT_FOUND',
          },
        });
        return;
      }
      case 'P2003': {
        res.status(400).json({
          success: false,
          error: {
            message: 'Violación de restricción de clave foránea',
            code: 'FOREIGN_KEY_VIOLATION',
          },
        });
        return;
      }
      default:
        break;
    }
  }

  // 4. Default Internal Server Error
  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    success: false,
    error: {
      message:
        process.env.NODE_ENV === 'production'
          ? 'Error interno del servidor'
          : err.message,
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
}
