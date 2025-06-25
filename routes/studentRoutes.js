import express from 'express';
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkCreateStudents,
  getStudentsByDeptAndSem,
  getDepartmentStats
} from '../controllers/studentController.js';

const router = express.Router();

// Bulk operations should come before parameterized routes
router.post('/bulk', bulkCreateStudents);
router.get('/stats', getDepartmentStats);
router.get('/by-dept-sem', getStudentsByDeptAndSem);

// Standard CRUD operations
router.get('/', getAllStudents);
router.get('/:id', getStudentById);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

export default router;