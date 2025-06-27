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

    const studentsData = req.body;

    if (!Array.isArray(studentsData) || studentsData.length === 0) {
      return res.status(400).json({ message: 'Input must be a non-empty array' });
    }

    const processedStudents = [];
    const errors = [];

    for (let i = 0; i < studentsData.length; i++) {
      const s = studentsData[i];

      try {
        const examDate = s.examDate
          ? new Date(Date.UTC(
              new Date(s.examDate).getUTCFullYear(),
              new Date(s.examDate).getUTCMonth(),
              new Date(s.examDate).getUTCDate()
            ))
          : undefined;


        const student = {
          name: (s.name || '').toString().trim(),
          regNo: (s.regNo || '').toString().trim().toLowerCase(),
          department: (s.department || '').toString().trim().toUpperCase(),
          semester: (s.semester || '').toString().trim(),
          email: (s.email || '').toString().trim().toLowerCase(),
          examDate,
          subject: (s.subject || '').toString().trim(),
          subjectCode: (s.subjectCode || '').toString().trim().toUpperCase(),
          type: (s.type || 'regular').toString().trim().toLowerCase(),
          isActive: true
        };

        // Validate required fields
        if (!student.name || !student.regNo || !student.department || !student.semester) {
          errors.push({ index: i, error: 'Missing required fields', data: s });
          continue;
        }

        // Validate email format
        if (student.email && !student.email.includes('@')) {
          errors.push({ index: i, error: 'Invalid email format', data: s });
          continue;
        }

        processedStudents.push(student);
      } catch (err) {
        errors.push({ index: i, error: err.message, data: s });
      }
    }

    // Deduplicate by regNo
    const seen = new Map();
    for (const student of processedStudents) {
      if (!seen.has(student.regNo)) {
        seen.set(student.regNo, student);
      }
    }

    const uniqueStudents = Array.from(seen.values());

    // Prepare bulk operations
    const bulkOps = uniqueStudents.map(student => ({
      updateOne: {
        filter: { regNo: student.regNo },
        update: { $set: student },
        upsert: true
      }
    }));

    // Execute bulkWrite
    const result = await Student.bulkWrite(bulkOps, { ordered: false });

    const totalInserted = result.upsertedCount || 0;
    const totalUpdated = result.modifiedCount || 0;

    // Fetch latest students and stats
    const finalStudents = await Student.find({ isActive: { $ne: false } });
    const deptDistribution = finalStudents.reduce((acc, s) => {
      const dept = s.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    console.log('=== BULK CREATE STUDENTS SUCCESS ===');
    console.log(`Inserted: ${totalInserted}, Updated: ${totalUpdated}`);
    console.log('Final department distribution:', deptDistribution);

    res.status(201).json({
      message: 'Bulk upload completed',
      summary: {
        totalReceived: studentsData.length,
        validRecords: processedStudents.length,
        uniqueRecords: uniqueStudents.length,
        inserted: totalInserted,
        updated: totalUpdated,
        processingErrors: errors.length,
        finalTotalStudents: finalStudents.length,
        departmentDistribution: deptDistribution
      },
      errors: {
        processing: errors
      }
    });
  } catch (error) {
    console.error('=== BULK CREATE STUDENTS ERROR ===', error);
    res.status(500).json({
      message: 'Error during bulk student upload',
      error: error.message
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