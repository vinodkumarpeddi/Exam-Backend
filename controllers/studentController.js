import Student from '../models/Student.js';

export const getAllStudents = async (req, res) => {
  try {
    console.log('Fetching all students...');
    
    const students = await Student.find({ isActive: { $ne: false } })
      .sort({ department: 1, semester: 1, regNo: 1 });
    
    console.log(`Found ${students.length} active students`);
    
    // Log department distribution for debugging
    const deptDistribution = students.reduce((acc, student) => {
      const dept = student.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Department distribution:', deptDistribution);
    
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ 
      message: 'Error fetching students',
      error: error.message 
    });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ 
      message: 'Error fetching student',
      error: error.message 
    });
  }
};

export const createStudent = async (req, res) => {
  try {
    console.log('Creating student:', req.body);
    
    const student = new Student(req.body);
    const savedStudent = await student.save();
    
    console.log('Student created successfully:', savedStudent._id);
    res.status(201).json(savedStudent);
  } catch (error) {
    console.error('Error creating student:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `Student with this ${field} already exists`,
        field: field,
        value: error.keyValue[field]
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(400).json({ 
      message: 'Error creating student',
      error: error.message 
    });
  }
};

export const updateStudent = async (req, res) => {
  try {
    console.log('Updating student:', req.params.id, req.body);
    
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    console.log('Student updated successfully:', student._id);
    res.json(student);
  } catch (error) {
    console.error('Error updating student:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `Student with this ${field} already exists`,
        field: field,
        value: error.keyValue[field]
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(400).json({ 
      message: 'Error updating student',
      error: error.message 
    });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    console.log('Deleting student:', req.params.id);
    
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    console.log('Student deleted successfully:', student._id);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ 
      message: 'Error deleting student',
      error: error.message 
    });
  }
};

export const bulkCreateStudents = async (req, res) => {
  try {
    console.log('=== BULK CREATE STUDENTS START ===');
    console.log('Request body length:', req.body.length);
    console.log('Sample data:', req.body.slice(0, 3));
    
    const studentsData = req.body;

    if (!Array.isArray(studentsData)) {
      return res.status(400).json({ message: 'Input must be an array' });
    }

    if (studentsData.length === 0) {
      return res.status(400).json({ message: 'Array cannot be empty' });
    }

    // Process and validate each student record
    const processedStudents = [];
    const errors = [];

    for (let i = 0; i < studentsData.length; i++) {
      try {
        const studentData = studentsData[i];
        
        // Clean and validate the data
        const processedStudent = {
          name: (studentData.name || '').toString().trim(),
          regNo: (studentData.regNo || '').toString().trim().toLowerCase(),
          department: (studentData.department || '').toString().trim().toUpperCase(),
          semester: (studentData.semester || '').toString().trim(),
          email: (studentData.email || '').toString().trim().toLowerCase(),
          examDate: studentData.examDate ? new Date(studentData.examDate) : undefined,
          subject: (studentData.subject || '').toString().trim(),
          subjectCode: (studentData.subjectCode || '').toString().trim().toUpperCase(),
          type: (studentData.type || 'regular').toString().toLowerCase(),
          isActive: true
        };

        // Validate required fields
        if (!processedStudent.name || !processedStudent.regNo || !processedStudent.department || !processedStudent.semester) {
          errors.push({
            index: i,
            error: 'Missing required fields (name, regNo, department, semester)',
            data: studentData
          });
          continue;
        }

        // Validate email format if provided
        if (processedStudent.email && !processedStudent.email.includes('@')) {
          errors.push({
            index: i,
            error: 'Invalid email format',
            data: studentData
          });
          continue;
        }

        processedStudents.push(processedStudent);
      } catch (error) {
        console.error(`Error processing student at index ${i}:`, error);
        errors.push({
          index: i,
          error: error.message,
          data: studentsData[i]
        });
      }
    }

    console.log(`Processed ${processedStudents.length} valid students out of ${studentsData.length}`);
    console.log(`Found ${errors.length} errors`);

    if (processedStudents.length === 0) {
      return res.status(400).json({ 
        message: 'No valid student records found',
        errors: errors
      });
    }

    // Remove duplicates based on regNo
    const uniqueStudents = [];
    const seenRegNos = new Set();
    const duplicates = [];

    for (const student of processedStudents) {
      if (seenRegNos.has(student.regNo)) {
        duplicates.push(student);
      } else {
        seenRegNos.add(student.regNo);
        uniqueStudents.push(student);
      }
    }

    console.log(`After removing duplicates: ${uniqueStudents.length} unique students`);
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate registration numbers`);
    }

    // Insert students in batches to handle potential duplicates gracefully
    const batchSize = 100;
    const savedStudents = [];
    const insertErrors = [];

    for (let i = 0; i < uniqueStudents.length; i += batchSize) {
      const batch = uniqueStudents.slice(i, i + batchSize);
      
      try {
        // Try to insert each student individually to handle duplicates
        for (const studentData of batch) {
          try {
            // Check if student already exists
            const existingStudent = await Student.findOne({ regNo: studentData.regNo });
            
            if (existingStudent) {
              // Update existing student instead of creating duplicate
              const updatedStudent = await Student.findByIdAndUpdate(
                existingStudent._id,
                studentData,
                { new: true, runValidators: true }
              );
              savedStudents.push(updatedStudent);
              console.log(`Updated existing student: ${studentData.regNo}`);
            } else {
              // Create new student
              const newStudent = new Student(studentData);
              const savedStudent = await newStudent.save();
              savedStudents.push(savedStudent);
              console.log(`Created new student: ${studentData.regNo}`);
            }
          } catch (error) {
            console.error(`Error saving student ${studentData.regNo}:`, error.message);
            insertErrors.push({
              regNo: studentData.regNo,
              error: error.message,
              data: studentData
            });
          }
        }
      } catch (error) {
        console.error(`Error processing batch starting at index ${i}:`, error);
        insertErrors.push({
          batch: i,
          error: error.message
        });
      }
    }

    console.log(`Successfully saved ${savedStudents.length} students`);
    console.log(`Insert errors: ${insertErrors.length}`);

    // Fetch final student count by department for verification
    const finalStudents = await Student.find({ isActive: { $ne: false } });
    const deptDistribution = finalStudents.reduce((acc, student) => {
      const dept = student.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    console.log('Final department distribution:', deptDistribution);
    console.log('=== BULK CREATE STUDENTS SUCCESS ===');

    res.status(201).json({
      message: 'Bulk student creation completed',
      students: savedStudents,
      summary: {
        totalReceived: studentsData.length,
        validRecords: processedStudents.length,
        uniqueRecords: uniqueStudents.length,
        savedStudents: savedStudents.length,
        duplicatesSkipped: duplicates.length,
        processingErrors: errors.length,
        insertErrors: insertErrors.length,
        finalTotalStudents: finalStudents.length,
        departmentDistribution: deptDistribution
      },
      errors: {
        processing: errors,
        insertion: insertErrors,
        duplicates: duplicates.map(d => d.regNo)
      }
    });

  } catch (error) {
    console.error('=== BULK CREATE STUDENTS ERROR ===');
    console.error('Error in bulk student creation:', error);
    res.status(500).json({ 
      message: 'Error in bulk student creation',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get students by department and semester
export const getStudentsByDeptAndSem = async (req, res) => {
  try {
    const { department, semester } = req.query;
    
    console.log('Fetching students for:', { department, semester });
    
    let query = { isActive: { $ne: false } };
    
    if (department) {
      query.department = department.toUpperCase();
    }
    
    if (semester) {
      query.semester = semester.toString();
    }
    
    const students = await Student.find(query)
      .sort({ regNo: 1 });
    
    console.log(`Found ${students.length} students matching criteria`);
    
    res.json(students);
  } catch (error) {
    console.error('Error fetching students by dept/sem:', error);
    res.status(500).json({ 
      message: 'Error fetching students',
      error: error.message 
    });
  }
};

// Get department statistics
export const getDepartmentStats = async (req, res) => {
  try {
    const students = await Student.find({ isActive: { $ne: false } });
    
    const stats = students.reduce((acc, student) => {
      const dept = student.department || 'Unknown';
      const sem = student.semester || 'Unknown';
      
      if (!acc[dept]) {
        acc[dept] = { total: 0, semesters: {} };
      }
      
      acc[dept].total++;
      
      if (!acc[dept].semesters[sem]) {
        acc[dept].semesters[sem] = 0;
      }
      
      acc[dept].semesters[sem]++;
      
      return acc;
    }, {});
    
    console.log('Department statistics:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching department stats:', error);
    res.status(500).json({ 
      message: 'Error fetching department statistics',
      error: error.message 
    });
  }
};