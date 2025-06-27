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
    
    const examData = req.body;
    if (examData.date) {
      const parsedDate = new Date(examData.date);
     
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

    
    if (!Array.isArray(exams)) {
      return res.status(400).json({ message: 'Input should be an array of exam schedules' });
    }

    
    const processedExams = exams.map((exam, index) => {
     
      if (!exam.date || !exam.time || !exam.subject || !exam.subjectCode || !exam.department || !exam.semester) {
        throw new Error(`Row ${index + 1}: Missing required fields`);
      }

     
      let parsedDate;
      
      try {
       
        if (typeof exam.date === 'string' && exam.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          parsedDate = new Date(exam.date + 'T00:00:00.000Z');
        } 
        
        else if (typeof exam.date === 'number') {
          const excelEpoch = new Date(1899, 11, 30); // Excel's epoch is 1900-01-00 (sort of)
          parsedDate = new Date(excelEpoch.getTime() + (exam.date - 1) * 86400000);
        }
       
        else {
          parsedDate = new Date(exam.date);
         
          if (isNaN(parsedDate.getTime())) {
            const formats = [
              'dd-MM-yyyy',    
              'MM/dd/yyyy',    
              'yyyy/MM/dd',    
              'dd MMM yyyy',  
              'MMM dd, yyyy', 
              'dd-MM-yy',      
              'MM/dd/yy'      
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

        
        if (!parsedDate || isNaN(parsedDate.getTime())) {
          throw new Error(`Invalid date format`);
        }

        
        parsedDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000);
      } catch (e) {
        throw new Error(`Row ${index + 1}: Invalid date format - ${exam.date}`);
      }

     
      if (!['FN', 'AN'].includes(exam.time.toUpperCase())) {
        throw new Error(`Row ${index + 1}: Time must be either 'FN' or 'AN'`);
      }

      if (!['1', '2', '3', '4', '5', '6', '7', '8'].includes(exam.semester.toString())) {
        throw new Error(`Row ${index + 1}: Invalid semester - must be between 1-8`);
      }

    
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

    
    const uniqueKeys = processedExams.map(e => ({
      date: e.date.toISOString().split('T')[0], // Compare by date only (UTC)
      time: e.time,
      subjectCode: e.subjectCode,
      department: e.department,
      semester: e.semester
    }));

   
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
          
          existing.isActive = true;
          Object.assign(existing, exam);
          toReactivate.push(existing);
        } else {
         
          const updateData = { ...exam };
          delete updateData._id; 
          toUpdate.push({
            updateOne: {
              filter: { _id: existing._id },
              update: { $set: updateData }
            }
          });
        }
      } else {
        
        toInsert.push(exam);
      }
    }

     const session = await ExamSchedule.startSession();
    session.startTransaction();

    try {
      
      let insertedExams = [];
      if (toInsert.length > 0) {
        insertedExams = await ExamSchedule.insertMany(toInsert, { session });
      }

      
      const reactivatePromises = toReactivate.map(e => e.save({ session }));
      const reactivatedExams = await Promise.all(reactivatePromises);

      
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

