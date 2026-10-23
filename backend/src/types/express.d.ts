declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: 'reviewer' | 'admin';
        team: string;
      };
      requestId?: string;
    }
  }
}

export {};
