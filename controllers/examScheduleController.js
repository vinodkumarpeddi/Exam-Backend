import { parse } from 'date-fns';
import ExamSchedule from '../models/ExamSchedule.js';

export const getAllExamSchedules = async (req, res) => {
  try {
    const exams = await ExamSchedule.find({ isActive: true }).sort({ date: 1, time: 1 });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExamScheduleById = async (req, res) => {
  try {
    const exam = await ExamSchedule.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam schedule not found' });
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createExamSchedule = async (req, res) => {
   try {
    // Adjust the incoming date to ensure it's stored correctly
    const examData = req.body;
    if (examData.date) {
      const parsedDate = new Date(examData.date);
      // Adjust for timezone offset to get the correct UTC date
      examData.date = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000);
    }
    
    const exam = new ExamSchedule(examData);
    const savedExam = await exam.save();
    res.status(201).json(savedExam);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Exam schedule already exists for this time slot' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

export const updateExamSchedule = async (req, res) => {
  try {
    const exam = await ExamSchedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!exam) {
      return res.status(404).json({ message: 'Exam schedule not found' });
    }
    res.json(exam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteExamSchedule = async (req, res) => {
  try {
    const exam = await ExamSchedule.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!exam) {
      return res.status(404).json({ message: 'Exam schedule not found' });
    }
    res.json({ message: 'Exam schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkCreateExamSchedules = async (req, res) => {
  try {
    let exams = req.body;

    // Validate input is an array
    if (!Array.isArray(exams)) {
      return res.status(400).json({ message: 'Input should be an array of exam schedules' });
    }

    // Process and validate each exam schedule
    const processedExams = exams.map((exam, index) => {
      // Validate required fields
      if (!exam.date || !exam.time || !exam.subject || !exam.subjectCode || !exam.department || !exam.semester) {
        throw new Error(`Row ${index + 1}: Missing required fields`);
      }

      // Parse and normalize the date
      let parsedDate;
      
      try {
        // Handle ISO format (YYYY-MM-DD) explicitly
        if (typeof exam.date === 'string' && exam.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          parsedDate = new Date(exam.date + 'T00:00:00.000Z');
        } 
        // Handle Excel numeric dates (serial numbers)
        else if (typeof exam.date === 'number') {
          const excelEpoch = new Date(1899, 11, 30); // Excel's epoch is 1900-01-00 (sort of)
          parsedDate = new Date(excelEpoch.getTime() + (exam.date - 1) * 86400000);
        }
        // Handle other string formats
        else {
          parsedDate = new Date(exam.date);
          // If the date is invalid, try parsing with date-fns
          if (isNaN(parsedDate.getTime())) {
            const formats = [
              'dd-MM-yyyy',    // 23-06-2025
              'MM/dd/yyyy',    // 06/23/2025
              'yyyy/MM/dd',    // 2025/06/23
              'dd MMM yyyy',   // 23 Jun 2025
              'MMM dd, yyyy',  // Jun 23, 2025
              'dd-MM-yy',      // 23-06-25
              'MM/dd/yy'       // 06/23/25
            ];
            
            for (const format of formats) {
              try {
                parsedDate = parse(exam.date.toString(), format, new Date());
                if (!isNaN(parsedDate.getTime())) break;
              } catch (e) {
                continue;
              }
            }
          }
        }

        // If still invalid, throw error
        if (!parsedDate || isNaN(parsedDate.getTime())) {
          throw new Error(`Invalid date format`);
        }

        // Normalize to UTC by removing timezone offset
        parsedDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000);
      } catch (e) {
        throw new Error(`Row ${index + 1}: Invalid date format - ${exam.date}`);
      }

      // Validate time
      if (!['FN', 'AN'].includes(exam.time.toUpperCase())) {
        throw new Error(`Row ${index + 1}: Time must be either 'FN' or 'AN'`);
      }

      // Validate semester
      if (!['1', '2', '3', '4', '5', '6', '7', '8'].includes(exam.semester.toString())) {
        throw new Error(`Row ${index + 1}: Invalid semester - must be between 1-8`);
      }

      // Standardize the data
      return {
        date: parsedDate,
        time: exam.time.toUpperCase(),
        subject: exam.subject.toString().trim(),
        subjectCode: exam.subjectCode.toString().trim().toUpperCase(),
        department: exam.department.toString().trim().toUpperCase(),
        semester: exam.semester.toString(),
        type: ['regular', 'supply'].includes(exam.type?.toString().toLowerCase()) 
          ? exam.type.toString().toLowerCase() 
          : 'regular',
        isActive: true
      };
    });

    // Create unique keys for lookup
    const uniqueKeys = processedExams.map(e => ({
      date: e.date.toISOString().split('T')[0], // Compare by date only (UTC)
      time: e.time,
      subjectCode: e.subjectCode,
      department: e.department,
      semester: e.semester
    }));

    // Find existing exams (active or inactive)
    const existingExams = await ExamSchedule.find({
      $or: uniqueKeys.map(key => ({
        date: { 
          $gte: new Date(`${key.date}T00:00:00.000Z`),
          $lte: new Date(`${key.date}T23:59:59.999Z`)
        },
        time: key.time,
        subjectCode: key.subjectCode,
        department: key.department,
        semester: key.semester
      }))
    });

    // Map existing exams by key for quick access
    const existingMap = new Map();
    existingExams.forEach(e => {
      const dateStr = e.date.toISOString().split('T')[0];
      const key = `${dateStr}_${e.time}_${e.subjectCode}_${e.department}_${e.semester}`;
      existingMap.set(key, e);
    });

    const toInsert = [];
    const toReactivate = [];
    const toUpdate = [];

    for (const exam of processedExams) {
      const dateStr = exam.date.toISOString().split('T')[0];
      const key = `${dateStr}_${exam.time}_${exam.subjectCode}_${exam.department}_${exam.semester}`;
      const existing = existingMap.get(key);

      if (existing) {
        if (!existing.isActive) {
          // Reactivate and update
          existing.isActive = true;
          Object.assign(existing, exam);
          toReactivate.push(existing);
        } else {
          // Update existing active record
          const updateData = { ...exam };
          delete updateData._id; // Remove _id if present
          toUpdate.push({
            updateOne: {
              filter: { _id: existing._id },
              update: { $set: updateData }
            }
          });
        }
      } else {
        // New exam schedule to insert
        toInsert.push(exam);
      }
    }

    // Execute all operations in a transaction
    const session = await ExamSchedule.startSession();
    session.startTransaction();

    try {
      // Bulk insert new exams
      let insertedExams = [];
      if (toInsert.length > 0) {
        insertedExams = await ExamSchedule.insertMany(toInsert, { session });
      }

      // Bulk update reactivated exams
      const reactivatePromises = toReactivate.map(e => e.save({ session }));
      const reactivatedExams = await Promise.all(reactivatePromises);

      // Bulk update existing exams
      let updatedCount = 0;
      if (toUpdate.length > 0) {
        const updateResult = await ExamSchedule.bulkWrite(toUpdate, { session });
        updatedCount = updateResult.modifiedCount;
      }

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        message: `Processed ${exams.length} exam schedules`,
        details: {
          inserted: insertedExams.length,
          reactivated: reactivatedExams.length,
          updated: updatedCount,
          skipped: exams.length - insertedExams.length - reactivatedExams.length - updatedCount
        },
        exams: [...insertedExams, ...reactivatedExams]
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(400).json({ 
      message: error.message,
      details: error.errors || null
    });
  }
};

