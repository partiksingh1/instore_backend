import { Router } from 'express';
import { login, registerStore } from '../controllers/authController.js';

const authRouter = Router();

// Sign-up route
authRouter.post('/register', registerStore);

// Sign-in route
authRouter.post('/login', login);

export default authRouter;
