import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import prisma from '../../db/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'brewdesk-super-secret-key-change-in-prod';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export class AuthService {
  private generateToken(user: { id: number; email: string; role: UserRole }): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  async loginWithEmail(email: string, password?: string) {
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // If Supabase is enabled, attempt auth verification
    if (supabase && password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        if (!user) {
          // Auto-sync Supabase user into PostgreSQL
          user = await prisma.user.create({
            data: {
              supabaseUid: data.user.id,
              email: data.user.email!,
              name: data.user.user_metadata?.name || data.user.email!.split('@')[0],
              role: (data.user.user_metadata?.role as UserRole) || 'cashier',
            },
          });
        }
      }
    }

    if (!user || !user.isActive) {
      throw new AppError('Credenciales inválidas o usuario inactivo', 401, 'INVALID_CREDENTIALS');
    }

    const token = this.generateToken(user);
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async loginWithPin(pinCode: string) {
    if (!pinCode || pinCode.length < 4) {
      throw new AppError('PIN inválido (mínimo 4 dígitos)', 400);
    }

    const user = await prisma.user.findFirst({
      where: { pinCode, isActive: true },
    });

    if (!user) {
      throw new AppError('PIN incorrecto o usuario inactivo', 401, 'INVALID_PIN');
    }

    const token = this.generateToken(user);
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getMe(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    // Check if user has an active cash session
    const activeSession = await prisma.cashSession.findFirst({
      where: {
        userId: user.id,
        status: 'open',
      },
      include: {
        cashRegister: true,
      },
    });

    return {
      user,
      activeCashSession: activeSession,
    };
  }

  async registerUser(data: {
    name: string;
    email: string;
    role: UserRole;
    pinCode?: string;
    password?: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new AppError('El correo electrónico ya está registrado', 409);
    }

    let supabaseUid = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (supabase && data.password) {
      const { data: sbData, error } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        user_metadata: { name: data.name, role: data.role },
        email_confirm: true,
      });
      if (!error && sbData.user) {
        supabaseUid = sbData.user.id;
      }
    }

    const newUser = await prisma.user.create({
      data: {
        supabaseUid,
        name: data.name,
        email: data.email,
        role: data.role,
        pinCode: data.pinCode || null,
      },
    });

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    };
  }
}
