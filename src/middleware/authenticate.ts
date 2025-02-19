// import { Request, Response, NextFunction } from 'express';
// import jwt from 'jsonwebtoken';
// import { UserPayload } from '../model/userModel';  // Adjust path to your UserPayload model

// // Middleware to authenticate user and attach user data to the request
// export const authenticate = (req: Request, res: Response, next: NextFunction)=> {
//   const token = req.headers.authorization?.split(' ')[1]; // Get token from Authorization header

//   if (!token) {
//      res.status(401).json({ error: 'No token provided.' });
//      return
//   }

//   try {
//     // Decode the token and ensure it's of the correct type
//     const decoded = jwt.verify(token, "mysecretkey");

//     // Narrowing the type to UserPayload after checking
//     if (isUserPayload(decoded)) {
//       req.user = decoded; // Attach decoded user data to the request
//       next();
//     } else {
//        res.status(401).json({ error: 'Invalid token structure.' });
//        return
//     }
//   } catch (error) {
//      res.status(401).json({ error: 'Invalid token.' });
//      return
//   }
// };

// // Type guard to check if the decoded token is a UserPayload
// function isUserPayload(decoded: any): decoded is UserPayload {
//   return typeof decoded === 'object' && 'id' in decoded && 'name' in decoded && 'email' in decoded && 'role' in decoded;
// }
