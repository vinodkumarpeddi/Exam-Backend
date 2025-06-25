import express from 'express';
import {
  getInvigilatorData,
  markAttendance,
  reportMalpractice,
  getAttendanceReport,
  debugFacultyAllocations
} from '../controllers/attendanceController.js';

const router = express.Router();

router.get('/invigilator/:facultyId', getInvigilatorData);
router.post('/mark-attendance', markAttendance);
router.post('/report-malpractice', reportMalpractice);
router.get('/report/:facultyId', getAttendanceReport);
router.get('/debug/:facultyId', debugFacultyAllocations);

export default router;