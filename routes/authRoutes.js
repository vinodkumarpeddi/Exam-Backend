import express from 'express';
import {
  login,
  addUser,
  changePassword,
  initAdmin,
  logout,
  addMultipleUsers,
  exportUsers
} from '../controllers/authController.js';
// import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.get('/init-admin', initAdmin);

// Protected routes
router.post('/add', addUser);
router.post('/change-password', changePassword);
router.post('/logout', logout);
router.post('/add-multiple', addMultipleUsers);
router.get('/export-users', exportUsers);



export default router;
