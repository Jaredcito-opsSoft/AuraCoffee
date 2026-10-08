import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import prisma from '../../db/prisma';
import { AppError } from './error.middleware';
import { UserRole } from '@prisma/client';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const jwtSecret = process.env.JWT_SECRET || 'brewdesk-super-secret-key-change-in-prod';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      // Check for PIN header in POS local mode
      const pinHeader = req.headers['x-user-pin'] as string | undefined;
      if (pinHeader) {
        const userByPin = await prisma.user.findFirst({
          where: { pinCode: pinHeader, isActive: true },
        });
        if (userByPin) {
          req.user = {
            id: userByPin.id,
            supabaseUid: userByPin.supabaseUid,
            email: userByPin.email,
            name: userByPin.name,
            role: userByPin.role,
            pinCode: userByPin.pinCode,
          };
          return next();
        }
      }
      return next(); // Unauthenticated, handled by requireAuth if protected
    }

    // 1. Try decoding local JWT first
    try {
      const decoded = jwt.verify(token, jwtSecret) as {
        id: number;
        email: string;
        role: UserRole;
      };

      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (dbUser && dbUser.isActive) {
        req.user = {
          id: dbUser.id,
          supabaseUid: dbUser.supabaseUid,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          pinCode: dbUser.pinCode,
        };
        return next();
      }
    } catch {
      // Local JWT failed, fallback to Supabase token verification
    }

    // 2. Verify with Supabase Auth if client is configured
    if (supabase) {
      const { data: { user: sbUser }, error } = await supabase.auth.getUser(token);
      if (!error && sbUser) {
        const dbUser = await prisma.user.findFirst({
          where: { supabaseUid: sbUser.id, isActive: true },
        });

        if (dbUser) {
          req.user = {
            id: dbUser.id,
            supabaseUid: dbUser.supabaseUid,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            pinCode: dbUser.pinCode,
          };
          return next();
        }
      }
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AppError('Acceso no autorizado. Inicie sesión.', 401, 'UNAUTHORIZED');
  }
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Acceso no autorizado.', 401, 'UNAUTHORIZED');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        `Permiso denegado. Se requiere uno de los roles: [${allowedRoles.join(', ')}]`,
        403,
        'FORBIDDEN'
      );
    }
    next();
  };
}
