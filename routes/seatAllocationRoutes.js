import express from 'express';
import {
  allocateSeats,
  getAllocations,
  deleteAllocation,
  deleteAllocationsByExam,
  checkRoomAvailability,
  notifySeatAllocatedStudents
} from '../controllers/seatAllocationController.js';

const router = express.Router();

router.post('/allocate-seats', allocateSeats);
router.get('/allocations', getAllocations);
router.get('/room-availability', checkRoomAvailability);
router.delete('/allocations/:id', deleteAllocation);
router.delete('/allocations/exam/:examId', deleteAllocationsByExam);
router.post('/notify-students', notifySeatAllocatedStudents);

export default router;