import FacultyAllocation from '../models/FacultyAllocation.js';
import ExamSchedule from '../models/ExamSchedule.js';
import { sendMail } from '../utils/sendmail.js';
import { facultyAllocationEmailTemplate } from '../utils/emailtemplates/templates.js';



export const getAllFacultyAllocations = async (req, res) => {
  try {
    const filter = {};

    if (req.query.examId) {
      filter.exam = req.query.examId;
    }

    const allocations = await FacultyAllocation.find(filter)
      .populate('exam')
      .populate('room')
      .sort({ 'exam.date': 1, 'exam.time': 1 });

    res.json(allocations);
  } catch (error) {
    console.error('Error fetching faculty allocations:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getFacultyAllocationById = async (req, res) => {
  try {
    const allocation = await FacultyAllocation.findById(req.params.id)
      .populate('exam')
      .populate('room');

    if (!allocation) {
      return res.status(404).json({ message: 'Faculty allocation not found' });
    }

    res.json(allocation);
  } catch (error) {
    console.error('Error fetching faculty allocation by ID:', error);
    res.status(500).json({ message: error.message });
  }
};

export const createFacultyAllocation = async (req, res) => {
  try {
    console.log('Creating faculty allocation with data:', req.body);
    
    const { facultyName, facultyId, role, exam,email, room, designation } = req.body;
    
    if (!facultyName || !facultyId || !role || !exam || !room|| !email) {
      return res.status(400).json({ 
        message: 'Missing required fields: facultyName, facultyId, role, exam, room' 
      });
    }

    // Check if faculty is already allocated for this exam (any room)
    const existingAllocation = await FacultyAllocation.findOne({
      facultyId: facultyId,
      exam: exam
    });

    if (existingAllocation) {
      return res.status(400).json({ 
        message: `Faculty ${facultyName} is already allocated for this exam` 
      });
    }

    const allocation = new FacultyAllocation({
      facultyName,
      facultyId,
      role,
      exam,
      room,
      email,
      designation: designation || 'faculty'
    });

    const saved = await allocation.save();
    
    const populated = await FacultyAllocation.findById(saved._id)
      .populate('exam')
      .populate('room');
      
    console.log('Successfully created allocation:', populated);
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating faculty allocation:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'This faculty member is already allocated for this exam' 
      });
    }
    
    res.status(400).json({ message: error.message });
  }
};

export const updateFacultyAllocation = async (req, res) => {
  try {
    const updated = await FacultyAllocation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('exam')
      .populate('room');

    if (!updated) {
      return res.status(404).json({ message: 'Faculty allocation not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating faculty allocation:', error);
    res.status(400).json({ message: error.message });
  }
};

export const deleteFacultyAllocation = async (req, res) => {
  try {
    const deleted = await FacultyAllocation.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Faculty allocation not found' });
    }
    res.json({ message: 'Faculty allocation deleted successfully' });
  } catch (error) {
    console.error('Error deleting faculty allocation:', error);
    res.status(500).json({ message: error.message });
  }
};

// export const bulkCreateFacultyAllocations = async (req, res) => {
//   try {
//     const allocations = req.body;
//     console.log('Bulk creating allocations:', allocations);

//     if (!Array.isArray(allocations)) {
//       return res.status(400).json({ message: 'Input must be an array' });
//     }

//     if (allocations.length === 0) {
//       return res.status(400).json({ message: 'No allocations provided' });
//     }

//     // Validate each allocation
//     const invalidAllocations = allocations.filter(a =>
//       !a.facultyName || !a.facultyId || !a.role || !a.exam || !a.room
//     );

//     if (invalidAllocations.length > 0) {
//       return res.status(400).json({ 
//         message: 'Each allocation must contain facultyName, facultyId, role, exam, and room',
//         invalidCount: invalidAllocations.length
//       });
//     }

//     const results = [];
//     const errors = [];

//     // Process allocations sequentially to handle duplicates properly
//     for (const allocationData of allocations) {
//       try {
//         // Check for existing allocation for this faculty and exam
//         const existing = await FacultyAllocation.findOne({
//           facultyId: allocationData.facultyId,
//           exam: allocationData.exam
//         });

//         if (existing) {
//           errors.push({
//             facultyName: allocationData.facultyName,
//             facultyId: allocationData.facultyId,
//             error: 'Already allocated for this exam'
//           });
//           continue;
//         }

//         const allocation = new FacultyAllocation({
//           facultyName: allocationData.facultyName,
//           facultyId: allocationData.facultyId,
//           role: allocationData.role || 'invigilator',
//           exam: allocationData.exam,
//           room: allocationData.room,
//           designation: allocationData.designation || 'faculty'
//         });

//         const saved = await allocation.save();
        
//         const populated = await FacultyAllocation.findById(saved._id)
//           .populate('exam')
//           .populate('room');
          
//         results.push(populated);
//         console.log(`Successfully allocated ${allocationData.facultyName} to room`);
//       } catch (error) {
//         console.error(`Error creating allocation for ${allocationData.facultyName}:`, error);
//         errors.push({
//           facultyName: allocationData.facultyName,
//           facultyId: allocationData.facultyId,
//           error: error.message
//         });
//       }
//     }

//     console.log(`Bulk creation completed: ${results.length} success, ${errors.length} errors`);

//     res.status(201).json({
//       success: results,
//       errors: errors,
//       successCount: results.length,
//       errorCount: errors.length,
//       message: `Successfully created ${results.length} allocations${errors.length > 0 ? `, ${errors.length} failed` : ''}`
//     });
//   } catch (error) {
//     console.error('Error in bulk create:', error);
//     res.status(500).json({ message: error.message });
//   }
// };


// export const bulkCreateFacultyAllocations = async (req, res) => {
//   try {
//     const allocations = req.body;
//     console.log('Bulk creating allocations:', allocations);

//     if (!Array.isArray(allocations) || allocations.length === 0) {
//       return res.status(400).json({ message: 'Input must be a non-empty array' });
//     }

//     // Better validation: reject entries with missing or empty values
//     const invalidAllocations = allocations.filter(a =>
//       !a?.facultyName?.trim() ||
//       !a?.facultyId?.trim() ||
//       !a?.role?.trim() ||
//       !a?.exam ||
//       !a?.room
//     );

//     if (invalidAllocations.length > 0) {
//       return res.status(400).json({
//         message: 'Each allocation must contain facultyName, facultyId, role, exam, and room',
//         invalidCount: invalidAllocations.length
//       });
//     }

//     const results = [];
//     const errors = [];

//     for (const allocationData of allocations) {
//       try {
//         // Prevent duplicate faculty for the same exam
//         const existing = await FacultyAllocation.findOne({
//           facultyId: allocationData.facultyId,
//           exam: allocationData.exam
//         });

//         if (existing) {
//           errors.push({
//             facultyName: allocationData.facultyName,
//             facultyId: allocationData.facultyId,
//             error: 'Already allocated for this exam'
//           });
//           continue;
//         }

//         const allocation = new FacultyAllocation({
//           facultyName: allocationData.facultyName.trim(),
//           facultyId: allocationData.facultyId.trim(),
//           role: allocationData.role.trim(),
//           exam: allocationData.exam,
//           room: allocationData.room,
//           designation: allocationData.designation?.trim() || 'faculty'
//         });

//         const saved = await allocation.save();
//         const populated = await FacultyAllocation.findById(saved._id)
//           .populate('exam')
//           .populate('room');

//         results.push(populated);
//       } catch (error) {
//         console.error(`Error creating allocation for ${allocationData.facultyName}:`, error);
//         errors.push({
//           facultyName: allocationData.facultyName,
//           facultyId: allocationData.facultyId,
//           error: error.message
//         });
//       }
//     }

//     res.status(201).json({
//       success: results,
//       errors: errors,
//       successCount: results.length,
//       errorCount: errors.length,
//       message: `Created ${results.length} allocations${errors.length ? `, ${errors.length} failed` : ''}`
//     });

//   } catch (error) {
//     console.error('Error in bulk create:', error);
//     res.status(500).json({ message: error.message });
//   }
// };

export const bulkCreateFacultyAllocations = async (req, res) => {
  try {
    const allocations = req.body;
    console.log('Bulk creating allocations:', allocations);

    if (!Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ message: 'Input must be a non-empty array' });
    }

    const invalidAllocations = allocations.filter(a =>
      !a?.facultyName?.trim() ||
      !a?.facultyId?.trim() ||
      !a?.role?.trim() ||
      !a?.exam ||
      !a?.room||
      !a?.email
    );

    if (invalidAllocations.length > 0) {
      return res.status(400).json({
        message: 'Each allocation must contain facultyName, facultyId, role, exam, and room',
        invalidCount: invalidAllocations.length
      });
    }

    const results = [];
    const errors = [];

    for (const allocationData of allocations) {
      try {
        const examDoc = await ExamSchedule.findById(allocationData.exam);
        if (!examDoc) {
          throw new Error('Exam not found for ID: ' + allocationData.exam);
        }

        const existing = await FacultyAllocation.find({
          facultyId: allocationData.facultyId
        }).populate('exam');

        const hasConflict = existing.some(e =>
          new Date(e.exam.date).toDateString() === new Date(examDoc.date).toDateString() &&
          e.exam.time === examDoc.time
        );

        if (hasConflict) {
          errors.push({
            facultyName: allocationData.facultyName,
            facultyId: allocationData.facultyId,
            error: `Already allocated on ${examDoc.date} ${examDoc.time}`
          });
          continue;
        }

        const allocation = new FacultyAllocation({
          facultyName: allocationData.facultyName.trim(),
          facultyId: allocationData.facultyId.trim(),
          role: allocationData.role.trim(),
          exam: allocationData.exam,
          room: allocationData.room,
          email: allocationData.email.trim(),
          designation: allocationData.designation?.trim() || 'faculty'
        });

        const saved = await allocation.save();
        const populated = await FacultyAllocation.findById(saved._id)
          .populate('exam')
          .populate('room');

        results.push(populated);
      } catch (error) {
        console.error(`Error creating allocation for ${allocationData.facultyName}:`, error);
        errors.push({
          facultyName: allocationData.facultyName,
          facultyId: allocationData.facultyId,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: results,
      errors: errors,
      successCount: results.length,
      errorCount: errors.length,
      message: `Created ${results.length} allocations${errors.length ? `, ${errors.length} failed` : ''}`
    });

  } catch (error) {
    console.error('Error in bulk create:', error);
    res.status(500).json({ message: error.message });
  }
};


export const clearAllocationsForExam = async (req, res) => {
  try {
    const { examIds } = req.body;
    
    if (!Array.isArray(examIds) || examIds.length === 0) {
      return res.status(400).json({ message: 'examIds array is required' });
    }

    const result = await FacultyAllocation.deleteMany({
      exam: { $in: examIds }
    });

    res.json({ 
      message: `Cleared ${result.deletedCount} allocations`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error clearing allocations:', error);
    res.status(500).json({ message: error.message });
  }
};
export const notifyAllocatedFaculties = async (req, res) => {
  try {
    const { examId } = req.body;
    if (!examId) {
      return res.status(400).json({ message: 'examId is required' });
    }

    // If examId can be an array, handle it accordingly; here I assume single ID
    const allocations = await FacultyAllocation.find({ exam: examId })
      .populate('exam')
      .populate('room');

    if (!allocations.length) {
      return res.status(404).json({ message: 'No faculty allocations found for this exam' });
    }

    const results = [];
    const errors = [];

    for (const alloc of allocations) {
      try {
        // Check if email is present in allocation (you may need to add it)
        if (!alloc.email) {
          errors.push({ facultyId: alloc.facultyId, error: 'Email not found' });
          continue;
        }

        // Use consistent room field name, e.g. room_no or roomNumber
        const roomNo = alloc.room?.room_no || 'N/A';

        const formattedDate = alloc.exam.date.toLocaleDateString();

        const html = facultyAllocationEmailTemplate({
          name: alloc.facultyName,
          roomNo,
          date: formattedDate,
          time: alloc.exam.time,
          designation: alloc.designation || 'Faculty'
        });

        await sendMail({
          to: alloc.email,
          subject: 'Exam Duty Notification',
          html
        });

        results.push({ facultyId: alloc.facultyId, status: 'sent' });
      } catch (err) {
        errors.push({ facultyId: alloc.facultyId, error: err.message });
      }
    }

    return res.json({
      message: `Emails sent: ${results.length}, failed: ${errors.length}`,
      success: results,
      failed: errors
    });
  } catch (error) {
    console.error('Error sending faculty notifications:', error);
    return res.status(500).json({ message: error.message });
  }
};
