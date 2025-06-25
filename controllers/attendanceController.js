import Attendance from '../models/Attendance.js';
import SeatAllocation from '../models/SeatAllocation.js';
import ExamSchedule from '../models/ExamSchedule.js';
import FacultyAllocation from '../models/FacultyAllocation.js';

export const getInvigilatorData = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { date, time } = req.query;
    
    console.log('Getting invigilator data for:', { facultyId, date, time });
    
    if (!facultyId) {
      return res.status(400).json({ message: 'Faculty ID is required' });
    }
    
    // Get current date and time if not provided
    const currentDate = date ? new Date(date) : new Date();
    const currentTime = time || (new Date().getHours() < 14 ? 'FN' : 'AN');
    
    console.log('Searching for faculty allocation with:', {
      facultyId,
      date: currentDate.toISOString().split('T')[0],
      time: currentTime
    });
    
    // First, find all faculty allocations for this faculty
    const allFacultyAllocations = await FacultyAllocation.find({
      facultyId: facultyId
    })
    .populate('exam')
    .populate('room');
    
    console.log('All faculty allocations found:', allFacultyAllocations.length);
    
    // Filter allocations by date and time
    const matchingAllocations = allFacultyAllocations.filter(allocation => {
      if (!allocation.exam) return false;
      
      const examDate = new Date(allocation.exam.date);
      const searchDate = new Date(currentDate);
      
      // Compare dates (year, month, day)
      const examDateStr = examDate.toISOString().split('T')[0];
      const searchDateStr = searchDate.toISOString().split('T')[0];
      
      console.log('Comparing dates:', {
        examDate: examDateStr,
        searchDate: searchDateStr,
        examTime: allocation.exam.time,
        searchTime: currentTime,
        match: examDateStr === searchDateStr && allocation.exam.time === currentTime
      });
      
      return examDateStr === searchDateStr && allocation.exam.time === currentTime;
    });
    
    console.log('Matching allocations found:', matchingAllocations.length);
    
    if (matchingAllocations.length === 0) {
      // Try to find any allocation for this faculty (for debugging)
      console.log('No matching allocations. All allocations for faculty:', 
        allFacultyAllocations.map(a => ({
          subject: a.exam?.subject,
          date: a.exam?.date,
          time: a.exam?.time,
          room: a.room?.room_no
        }))
      );
      
      return res.status(404).json({ 
        message: 'No room allocation found for this faculty on the specified date and time',
        date: currentDate.toDateString(),
        time: currentTime,
        facultyId: facultyId,
        debug: {
          totalAllocations: allFacultyAllocations.length,
          searchCriteria: {
            facultyId,
            date: currentDate.toISOString().split('T')[0],
            time: currentTime
          },
          availableAllocations: allFacultyAllocations.map(a => ({
            subject: a.exam?.subject,
            date: a.exam?.date ? new Date(a.exam.date).toISOString().split('T')[0] : 'No date',
            time: a.exam?.time,
            room: a.room?.room_no
          }))
        }
      });
    }
    
    // Use the first matching allocation
    const facultyAllocation = matchingAllocations[0];
    
    console.log('Using faculty allocation:', facultyAllocation);
    
    // Get seat allocations for this room and exam
    const seatAllocations = await SeatAllocation.find({
      exam: facultyAllocation.exam._id,
      room: facultyAllocation.room._id
    })
    .populate('student')
    .populate('exam')
    .populate('room')
    .sort({ seatNumber: 1 });
    
    console.log(`Found ${seatAllocations.length} seat allocations`);
    
    // Get existing attendance records
    const attendanceRecords = await Attendance.find({
      exam: facultyAllocation.exam._id,
      room: facultyAllocation.room._id,
      'invigilator.facultyId': facultyId
    });
    
    console.log(`Found ${attendanceRecords.length} attendance records`);
    
    // Create attendance map for quick lookup
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.student.toString()] = record;
    });
    
    // Combine seat allocations with attendance data
    const studentsWithAttendance = seatAllocations.map(allocation => ({
      _id: allocation._id,
      student: allocation.student,
      seatNumber: allocation.seatNumber,
      attendance: attendanceMap[allocation.student._id.toString()] || {
        status: 'present',
        malpractice: { reported: false, description: '' }
      }
    }));
    
    const responseData = {
      facultyInfo: {
        facultyId: facultyAllocation.facultyId,
        facultyName: facultyAllocation.facultyName,
        role: facultyAllocation.role
      },
      examInfo: facultyAllocation.exam,
      roomInfo: facultyAllocation.room,
      students: studentsWithAttendance,
      summary: {
        totalStudents: studentsWithAttendance.length,
        presentCount: studentsWithAttendance.filter(s => s.attendance.status === 'present').length,
        absentCount: studentsWithAttendance.filter(s => s.attendance.status === 'absent').length,
        malpracticeCount: studentsWithAttendance.filter(s => s.attendance.malpractice?.reported).length
      },
      currentDate: currentDate.toDateString(),
      currentTime: currentTime
    };
    
    console.log('Sending response with summary:', responseData.summary);
    
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching invigilator data:', error);
    res.status(500).json({ 
      message: 'Error fetching invigilator data', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const markAttendance = async (req, res) => {
  try {
    const { studentId, examId, roomId, status, facultyId, facultyName } = req.body;
    
    console.log('Marking attendance:', { studentId, examId, roomId, status, facultyId });
    
    if (!studentId || !examId || !roomId || !status || !facultyId || !facultyName) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Get exam details for date and time
    const exam = await ExamSchedule.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Update or create attendance record
    const attendanceData = {
      student: studentId,
      exam: examId,
      room: roomId,
      invigilator: {
        facultyId: facultyId,
        facultyName: facultyName
      },
      status: status,
      examDate: exam.date,
      examTime: exam.time,
      markedAt: new Date()
    };
    
    const attendance = await Attendance.findOneAndUpdate(
      { student: studentId, exam: examId },
      attendanceData,
      { upsert: true, new: true, runValidators: true }
    );
    
    console.log('Attendance marked:', attendance);
    
    res.json({
      message: 'Attendance marked successfully',
      attendance: attendance
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ 
      message: 'Error marking attendance', 
      error: error.message 
    });
  }
};

export const reportMalpractice = async (req, res) => {
  try {
    const { studentId, examId, description, facultyId, facultyName } = req.body;
    
    console.log('Reporting malpractice:', { studentId, examId, description, facultyId });
    
    if (!studentId || !examId || !description || !facultyId || !facultyName) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Get exam details
    const exam = await ExamSchedule.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Find existing attendance record or create new one
    let attendance = await Attendance.findOne({ student: studentId, exam: examId });
    
    if (!attendance) {
      // Create new attendance record with malpractice
      attendance = new Attendance({
        student: studentId,
        exam: examId,
        room: req.body.roomId,
        invigilator: {
          facultyId: facultyId,
          facultyName: facultyName
        },
        status: 'present',
        examDate: exam.date,
        examTime: exam.time,
        malpractice: {
          reported: true,
          description: description,
          reportedAt: new Date()
        }
      });
    } else {
      // Update existing record
      attendance.malpractice = {
        reported: true,
        description: description,
        reportedAt: new Date()
      };
      attendance.invigilator = {
        facultyId: facultyId,
        facultyName: facultyName
      };
    }
    
    await attendance.save();
    
    console.log('Malpractice reported:', attendance);
    
    res.json({
      message: 'Malpractice reported successfully',
      attendance: attendance
    });
  } catch (error) {
    console.error('Error reporting malpractice:', error);
    res.status(500).json({ 
      message: 'Error reporting malpractice', 
      error: error.message 
    });
  }
};

export const getAttendanceReport = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { date, time, examId } = req.query;
    
    let query = { 'invigilator.facultyId': facultyId };
    
    if (examId) {
      query.exam = examId;
    }
    
    if (date && time) {
      const queryDate = new Date(date);
      query.examDate = {
        $gte: new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate()),
        $lt: new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate() + 1)
      };
      query.examTime = time;
    }
    
    const attendanceRecords = await Attendance.find(query)
      .populate('student')
      .populate('exam')
      .populate('room')
      .sort({ examDate: -1, examTime: 1, 'student.regNo': 1 });
    
    res.json(attendanceRecords);
  } catch (error) {
    console.error('Error fetching attendance report:', error);
    res.status(500).json({ 
      message: 'Error fetching attendance report', 
      error: error.message 
    });
  }
};

// Add a debug endpoint to check faculty allocations
export const debugFacultyAllocations = async (req, res) => {
  try {
    const { facultyId } = req.params;
    
    // Get all allocations for this faculty
    const allAllocations = await FacultyAllocation.find({ facultyId })
      .populate('exam')
      .populate('room');
    
    // Get all exams
    const allExams = await ExamSchedule.find({ isActive: { $ne: false } });
    
    // Get all seat allocations
    const allSeatAllocations = await SeatAllocation.find()
      .populate('exam')
      .populate('room')
      .populate('student');
    
    res.json({
      facultyId,
      totalAllocations: allAllocations.length,
      allocations: allAllocations.map(a => ({
        id: a._id,
        facultyName: a.facultyName,
        role: a.role,
        exam: a.exam ? {
          id: a.exam._id,
          subject: a.exam.subject,
          subjectCode: a.exam.subjectCode,
          date: a.exam.date,
          time: a.exam.time,
          department: a.exam.department,
          semester: a.exam.semester
        } : null,
        room: a.room ? {
          id: a.room._id,
          room_no: a.room.room_no,
          block: a.room.block,
          floor_no: a.room.floor_no,
          capacity: a.room.capacity
        } : null
      })),
      totalExams: allExams.length,
      exams: allExams.slice(0, 10), // Limit to first 10 for debugging
      totalSeatAllocations: allSeatAllocations.length,
      seatAllocations: allSeatAllocations.slice(0, 10) // Limit to first 10 for debugging
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ 
      message: 'Error fetching debug data', 
      error: error.message 
    });
  }
};