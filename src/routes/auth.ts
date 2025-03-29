import { Router } from 'express';
import { adminRegisterStore, login, registerStore, signupAdmin } from '../controllers/authController.js';

const authRouter = Router();

// Sign-up route
authRouter.post('/register', registerStore);
authRouter.post('/signup/admin', signupAdmin);
authRouter.post('/adminRegister', adminRegisterStore);
// Sign-in route
authRouter.post('/login', login);

export default authRouter;
