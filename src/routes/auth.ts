import { Router } from 'express';
import { login, registerStore, signupAdmin } from '../controllers/authController.js';

const authRouter = Router();

// Sign-up route
authRouter.post('/register', registerStore);
authRouter.post('/signup/admin', signupAdmin);
// Sign-in route
authRouter.post('/login', login);

export default authRouter;
