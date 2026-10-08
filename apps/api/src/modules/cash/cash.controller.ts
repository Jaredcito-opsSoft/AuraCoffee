import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CashService } from './cash.service';

const cashService = new CashService();

const openSessionSchema = z.object({
  cashRegisterId: z.number().int().positive(),
  openingBalanceCents: z.number().int().nonnegative(),
});

const movementSchema = z.object({
  type: z.enum(['in_deposit', 'out_withdrawal', 'petty_cash_expense', 'tip_payout']),
  amountCents: z.number().int().positive(),
  reason: z.string().min(3),
});

const closeSessionSchema = z.object({
  actualCashCents: z.number().int().nonnegative(),
  closingNotes: z.string().optional(),
});

export class CashController {
  async getRegisters(_req: Request, res: Response, next: NextFunction) {
    try {
      const registers = await cashService.getRegisters();
      res.json({ success: true, data: registers });
    } catch (err) {
      next(err);
    }
  }

  async getCurrentSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const session = await cashService.getCurrentSession(userId);
      res.json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  }

  async openSession(req: Request, res: Response, next: NextFunction) {
    try {
      const data = openSessionSchema.parse(req.body);
      const userId = req.user!.id;
      const session = await cashService.openSession({ ...data, userId });
      res.status(201).json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  }

  async addMovement(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = Number(req.params.sessionId);
      const data = movementSchema.parse(req.body);
      const userId = req.user!.id;
      const movement = await cashService.addMovement({
        sessionId,
        userId,
        ...data,
      });
      res.status(201).json({ success: true, data: movement });
    } catch (err) {
      next(err);
    }
  }

  async getCorteX(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = Number(req.params.sessionId);
      const corteX = await cashService.getCorteX(sessionId);
      res.json({ success: true, data: corteX });
    } catch (err) {
      next(err);
    }
  }

  async closeSession(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = Number(req.params.sessionId);
      const data = closeSessionSchema.parse(req.body);
      const userId = req.user!.id;
      const closed = await cashService.closeSession({
        sessionId,
        userId,
        ...data,
      });
      res.json({ success: true, data: closed });
    } catch (err) {
      next(err);
    }
  }
}
