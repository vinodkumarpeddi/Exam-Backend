import express from 'express';
import {
  getAllFacultyAllocations,
  getFacultyAllocationById,
  createFacultyAllocation,
  updateFacultyAllocation,
  deleteFacultyAllocation,
  bulkCreateFacultyAllocations,
  clearAllocationsForExam,
  notifyAllocatedFaculties
} from '../controllers/facultyAllocationController.js'; 

const router = express.Router();

router.get('/', getAllFacultyAllocations);
router.get('/:id', getFacultyAllocationById);
router.post('/', createFacultyAllocation);
router.put('/:id', updateFacultyAllocation);
router.delete('/:id', deleteFacultyAllocation);
router.post('/bulk', bulkCreateFacultyAllocations);
router.post('/clear', clearAllocationsForExam);
router.post('/notify', notifyAllocatedFaculties);


export default router;