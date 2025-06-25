import SeatAllocation from '../models/SeatAllocation.js';
import Student from '../models/Student.js';
import Room from '../models/Room.js';
import ExamSchedule from '../models/ExamSchedule.js';
import {sendMail} from '../utils/sendmail.js';
import { studentExamEmailTemplate } from '../utils/emailtemplates/Studenttemplate.js';
export const allocateSeats = async (req, res) => {
  try {
    const { examId, roomType } = req.body;

    console.log('=== SEAT ALLOCATION STARTED ===');
    console.log('Exam ID:', examId, '| Room Type:', roomType);

    // Validate input
    if (!examId || !roomType) {
      console.error('Validation failed: Missing examId or roomType');
      return res.status(400).json({ 
        message: 'Both examId and roomType are required',
        requiredFields: ['examId', 'roomType']
      });
    }

    // Get exam details with enhanced error handling
    const exam = await ExamSchedule.findById(examId).lean();
    if (!exam) {
      console.error('Exam not found with ID:', examId);
      return res.status(404).json({ 
        message: 'Exam not found',
        examId,
        suggestion: 'Verify the exam ID exists and is active'
      });
    }

    // Parse exam date with multiple format support
    const parseExamDate = (dateString) => {
      if (!dateString) return null;
      
      const formats = [
        'yyyy-MM-dd', 'dd-MM-yyyy', 'MM/dd/yyyy', 
        'yyyy/MM/dd', 'dd MMM yyyy', 'MMM dd, yyyy',
        'dd-MM-yy', 'MM/dd/yy'
      ];
      
      for (const format of formats) {
        try {
          const parsed = parse(dateString.toString(), format, new Date());
          if (!isNaN(parsed.getTime())) return parsed;
        } catch (e) {
          continue;
        }
      }
      
      const fallback = new Date(dateString);
      return !isNaN(fallback.getTime()) ? fallback : null;
    };

    const examDate = parseExamDate(exam.date);
    if (!examDate) {
      console.error('Invalid exam date format:', exam.date);
      return res.status(400).json({ 
        message: 'Invalid exam date format',
        receivedDate: exam.date,
        acceptableFormats: [
          'YYYY-MM-DD', 'DD-MM-YYYY', 'MM/DD/YYYY',
          'YYYY/MM/DD', 'DD MMM YYYY', 'MMM DD, YYYY'
        ]
      });
    }

    const examDateFormatted = examDate.toISOString().split('T')[0];
    console.log('Exam details:', {
      subject: exam.subject,
      subjectCode: exam.subjectCode,
      department: exam.department,
      semester: exam.semester,
      date: examDateFormatted,
      time: exam.time
    });

    // Build student query with flexible date matching
    const studentQuery = {
      department: exam.department,
      semester: exam.semester,
      isActive: { $ne: false }
    };

    // Subject matching logic
    if (exam.subjectCode) {
      studentQuery.subjectCode = exam.subjectCode;
    } else if (exam.subject) {
      studentQuery.subject = { $regex: exam.subject, $options: 'i' };
    }

    console.log('Student query:', studentQuery);

    // Get all potential students first
    const allStudents = await Student.find(studentQuery).sort({ regNo: 1 });
    console.log(`Found ${allStudents.length} potential students before date filtering`);

    // Filter by date match with flexible parsing
    const students = allStudents.filter(student => {
      const studentExamDate = parseExamDate(student.examDate);
      if (!studentExamDate) {
        console.warn(`Student ${student.regNo} has invalid/missing exam date: ${student.examDate}`);
        return false;
      }
      return studentExamDate.toISOString().split('T')[0] === examDateFormatted;
    });

    console.log(`After date filtering: ${students.length} eligible students`);

    if (students.length === 0) {
      const errorData = {
        message: `No eligible students found matching the criteria`,
        details: {
          exam: {
            subject: exam.subject,
            subjectCode: exam.subjectCode,
            department: exam.department,
            semester: exam.semester,
            date: examDateFormatted
          },
          potentialStudents: allStudents.length,
          filteredOut: allStudents.length
        }
      };
      console.error('No eligible students:', errorData);
      return res.status(400).json(errorData);
    }

    // Room allocation logic
    const allRooms = await Room.find({ 
      isActive: { $ne: false }, 
      room_type: roomType 
    }).sort({ capacity: 1 });

    console.log(`Found ${allRooms.length} ${roomType} rooms`);

    if (allRooms.length === 0) {
      return res.status(400).json({ 
        message: `No ${roomType} rooms available`,
        roomType,
        suggestion: 'Try a different room type or add more rooms'
      });
    }

    // Check for room conflicts
    const conflictingExams = await ExamSchedule.find({
      date: {
        $gte: new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate()),
        $lt: new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate() + 1)
      },
      time: exam.time,
      _id: { $ne: examId },
      isActive: { $ne: false }
    });

    const conflictingExamIds = conflictingExams.map(e => e._id);
    const occupiedRoomAllocations = await SeatAllocation.find({
      exam: { $in: conflictingExamIds }
    }).populate('room');

    const occupiedRoomIds = new Set(
      occupiedRoomAllocations.map(allocation => allocation.room._id.toString())
    );

    const availableRooms = allRooms.filter(room => 
      !occupiedRoomIds.has(room._id.toString())
    );

    console.log(`Available rooms after conflict check: ${availableRooms.length}`);

    if (availableRooms.length === 0) {
      return res.status(400).json({
        message: `No available ${roomType} rooms for ${examDate.toDateString()} at ${exam.time}`,
        conflictingExams: conflictingExams.map(e => ({
          subject: e.subject,
          subjectCode: e.subjectCode,
          department: e.department,
          semester: e.semester
        })),
        suggestion: 'Consider changing exam time or using different room types'
      });
    }

    const totalCapacity = availableRooms.reduce((sum, room) => sum + room.capacity, 0);
    if (students.length > totalCapacity) {
      return res.status(400).json({
        message: `Insufficient ${roomType} room capacity`,
        students: students.length,
        availableCapacity: totalCapacity,
        requiredAdditional: students.length - totalCapacity,
        roomsNeeded: Math.ceil((students.length - totalCapacity) / Math.max(...availableRooms.map(r => r.capacity), 1))
      });
    }

    // Clear existing allocations
    const deleteResult = await SeatAllocation.deleteMany({ exam: examId });
    console.log(`Cleared ${deleteResult.deletedCount} existing allocations`);

    // Remove duplicate students by regNo
    const uniqueStudents = [];
    const seenRegNos = new Set();
    for (const student of students) {
      if (!seenRegNos.has(student.regNo)) {
        seenRegNos.add(student.regNo);
        uniqueStudents.push(student);
      }
    }

    console.log(`Unique students after deduplication: ${uniqueStudents.length}`);

    // Allocation algorithm
    const allocations = [];
    let studentIndex = 0;
    let roomIndex = 0;

    while (studentIndex < uniqueStudents.length && roomIndex < availableRooms.length) {
      const room = availableRooms[roomIndex];
      const roomCapacity = room.capacity;
      
      for (let seatNum = 0; seatNum < roomCapacity && studentIndex < uniqueStudents.length; seatNum++) {
        const rowLetter = String.fromCharCode(65 + Math.floor(seatNum / 10)); // A, B, C...
        const seatNumber = `${rowLetter}${(seatNum % 10) + 1}`;
        
        allocations.push(new SeatAllocation({
          student: uniqueStudents[studentIndex]._id,
          exam: examId,
          room: room._id,
          seatNumber: seatNumber,
          allocatedAt: new Date()
        }));
        
        studentIndex++;
      }
      
      roomIndex++;
    }

    // Batch insert allocations
    const savedAllocations = await SeatAllocation.insertMany(allocations);
    console.log(`Successfully created ${savedAllocations.length} allocations`);

    // Populate results for response
    const populatedAllocations = await SeatAllocation.find({
      _id: { $in: savedAllocations.map(a => a._id) }
    })
      .populate('student', 'name regNo department semester email')
      .populate('exam', 'subject subjectCode date time')
      .populate('room', 'room_no block floor_no capacity room_type')
      .sort({ 'room.room_no': 1, seatNumber: 1 });

    console.log('=== SEAT ALLOCATION COMPLETED SUCCESSFULLY ===');
    return res.status(201).json({
      success: true,
      allocations: populatedAllocations,
      stats: {
        totalStudents: students.length,
        uniqueStudents: uniqueStudents.length,
        roomsUsed: roomIndex,
        seatsAllocated: savedAllocations.length,
        remainingCapacity: totalCapacity - savedAllocations.length
      },
      examDetails: {
        subject: exam.subject,
        subjectCode: exam.subjectCode,
        date: examDateFormatted,
        time: exam.time
      }
    });

  } catch (error) {
    console.error('=== SEAT ALLOCATION FAILED ===');
    console.error('Error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error during seat allocation',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      } : undefined,
      suggestion: 'Check server logs for detailed error information'
    });
  }
};

export const getAllocations = async (req, res) => {
  try {
    const { examId } = req.query;
    
    let query = {};
    if (examId) {
      query.exam = examId;
    }
    
    const allocations = await SeatAllocation.find(query)
      .populate('student')
      .populate('exam')
      .populate('room')
      .sort({ 'room.room_no': 1, seatNumber: 1 });
    
    res.json(allocations);
  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteAllocation = async (req, res) => {
  try {
    const allocation = await SeatAllocation.findByIdAndDelete(req.params.id);
    if (!allocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }
    res.json({ message: 'Allocation deleted successfully' });
  } catch (error) {
    console.error('Error deleting allocation:', error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteAllocationsByExam = async (req, res) => {
  try {
    const { examId } = req.params;
    
    if (!examId) {
      return res.status(400).json({ message: 'Exam ID is required' });
    }
    
    const result = await SeatAllocation.deleteMany({ exam: examId });
    
    res.json({ 
      message: 'Allocations cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing allocations:', error);
    res.status(500).json({ message: error.message });
  }
};

// Enhanced room availability check
export const checkRoomAvailability = async (req, res) => {
  try {
    const { date, time } = req.query;
    
    if (!date || !time) {
      return res.status(400).json({ message: 'Date and time are required' });
    }
    
    const examDate = new Date(date);
    
    // Get all exams on the same date and time
    const conflictingExams = await ExamSchedule.find({
      date: {
        $gte: new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate()),
        $lt: new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate() + 1)
      },
      time: time,
      isActive: { $ne: false }
    });
    
    // Get room IDs that are already allocated
    const conflictingExamIds = conflictingExams.map(e => e._id);
    const occupiedRoomAllocations = await SeatAllocation.find({
      exam: { $in: conflictingExamIds }
    }).populate('room');
    
    const occupiedRoomIds = new Set(
      occupiedRoomAllocations.map(allocation => allocation.room._id.toString())
    );
    
    // Get all rooms
    const allRooms = await Room.find({ isActive: { $ne: false } }).sort({ room_no: 1 });
    
    // Categorize rooms
    const availableRooms = allRooms.filter(room => 
      !occupiedRoomIds.has(room._id.toString())
    );
    
    const occupiedRooms = allRooms.filter(room => 
      occupiedRoomIds.has(room._id.toString())
    );
    
    res.json({
      date: examDate.toDateString(),
      time: time,
      totalRooms: allRooms.length,
      availableRooms: {
        count: availableRooms.length,
        rooms: availableRooms,
        totalCapacity: availableRooms.reduce((sum, room) => sum + room.capacity, 0)
      },
      occupiedRooms: {
        count: occupiedRooms.length,
        rooms: occupiedRooms,
        totalCapacity: occupiedRooms.reduce((sum, room) => sum + room.capacity, 0)
      },
      conflictingExams: conflictingExams.map(exam => ({
        id: exam._id,
        subject: exam.subject,
        subjectCode: exam.subjectCode,
        department: exam.department,
        semester: exam.semester
      }))
    });
  } catch (error) {
    console.error('Error checking room availability:', error);
    res.status(500).json({ message: error.message });
  }
};
export const notifySeatAllocatedStudents = async (req, res) => {
  try {
    const { examId } = req.body;
    if (!examId) return res.status(400).json({ message: 'examId is required' });

    const allocations = await SeatAllocation.find({ exam: examId })
      .populate('student')
      .populate('exam')
      .populate('room');

    const results = [];
    const errors = [];

    for (const alloc of allocations) {
      const student = alloc.student;
      if (!student?.email) continue;

      const html = studentExamEmailTemplate({
        name: student.name,
        date: new Date(alloc.exam.date).toLocaleDateString(),
        time: alloc.exam.time,
        roomNo: alloc.room.room_no,
        subject: alloc.exam.subject,
      });

      try {
        await sendMail({
          to: student.email,
          subject: `Exam Notification - ${alloc.exam.subject}`,
          html,
        });
        results.push({ email: student.email, status: 'Sent' });
      } catch (err) {
        console.error(`Email failed for ${student.email}: ${err.message}`);
        errors.push({ email: student.email, error: err.message });
      }
    }

    res.json({
      successCount: results.length,
      errorCount: errors.length,
      errors,
    });

  } catch (error) {
    console.error('Notify Error:', error);
    res.status(500).json({ message: 'Error notifying students', error: error.message });
  }
};