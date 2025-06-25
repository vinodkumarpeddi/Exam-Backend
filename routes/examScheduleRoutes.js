import express from 'express';
import {
  getAllExamSchedules,
  getExamScheduleById,
  createExamSchedule,
  updateExamSchedule,
  deleteExamSchedule,
  bulkCreateExamSchedules
} from '../controllers/examScheduleController.js';

const router = express.Router();

router.get('/', getAllExamSchedules);
router.get('/:id', getExamScheduleById);
router.post('/', createExamSchedule);
router.put('/:id', updateExamSchedule);
router.delete('/:id', deleteExamSchedule);
router.post('/bulk', bulkCreateExamSchedules);

export default router;