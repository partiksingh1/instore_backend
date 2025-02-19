import { Request, Response, NextFunction } from 'express';

// Middleware to check if the user is an admin
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Assuming that the user's role is stored in the request object (e.g., req.user.role)
  const userRole = req.user?.role;

  if (userRole !== 'ADMIN') {
     res.status(403).json({ error: 'Access denied. Admin role is required.' });
     return
  }

  next(); // Proceed to the next middleware or controller function
};