import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true
  },
  regNo: {
    type: String,
    required: [true, 'Registration number is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    uppercase: true
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
examDate: {
  type: Date,
  required: true,
  set: function(value) {
    if (!value) return undefined;
    
    // If it's a string in YYYY-MM-DD format, parse it as UTC midnight
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00Z`); // Force UTC
    }
    
    // If it's already a Date object
    if (value instanceof Date) {
      return !isNaN(value.getTime()) ? value : undefined;
    }
    
    // Try parsing as ISO string
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
    
    // Try other formats if needed
    return undefined;
  }
},
  subject: {
    type: String,
    trim: true
  },
  subjectCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['regular', 'supply', 'improvement'],
    default: 'regular',
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
studentSchema.index({ department: 1, semester: 1 });
// studentSchema.index({ regNo: 1 });
studentSchema.index({ isActive: 1 });

// Pre-save middleware to ensure data consistency
studentSchema.pre('save', function(next) {
  // Ensure department is uppercase
  if (this.department) {
    this.department = this.department.toString().trim().toUpperCase();
  }
  
  // Ensure regNo is lowercase
  if (this.regNo) {
    this.regNo = this.regNo.toString().trim().toLowerCase();
  }
  
  // Ensure semester is string
  if (this.semester) {
    this.semester = this.semester.toString().trim();
  }
  
  // Ensure subjectCode is uppercase if provided
  if (this.subjectCode) {
    this.subjectCode = this.subjectCode.toString().trim().toUpperCase();
  }
  
  next();
});

export default mongoose.model('Student', studentSchema);