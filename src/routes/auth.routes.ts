import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { signupSchema, loginSchema } from '../validators/auth.validator';

const router = Router();

// Public routes
router.post('/signup', validateBody(signupSchema), (req, res, next) =>
  authController.signup(req, res, next)
);

router.post('/login', validateBody(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

// Protected routes
router.get('/me', authenticate, (req, res, next) =>
  authController.getMe(req, res, next)
);

router.post('/logout', authenticate, (req, res) =>
  authController.logout(req, res)
);

export default router;
