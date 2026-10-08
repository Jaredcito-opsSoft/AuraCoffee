import { UserRole } from '@prisma/client';

export interface AuthUser {
  id: number;
  supabaseUid: string;
  email: string;
  name: string;
  role: UserRole;
  pinCode?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
