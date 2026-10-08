import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';

const authService = new AuthService();

const loginSchema = z.object({
  email: z.string().email('Correo electrónico no válido'),
  password: z.string().optional(),
});

const pinLoginSchema = z.object({
  pin: z.string().min(4, 'El PIN debe tener al menos 4 dígitos'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico no válido'),
  role: z.enum(['admin', 'manager', 'cashier', 'barista', 'waiter']),
  pinCode: z.string().min(4).max(6).optional(),
  password: z.string().min(6).optional(),
});

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.loginWithEmail(data.email, data.password);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async pinLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const data = pinLoginSchema.parse(req.body);
      const result = await authService.loginWithPin(data.pin);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await authService.getMe(userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const result = await authService.registerUser(data);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
