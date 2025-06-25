import mongoose from 'mongoose';

const examScheduleSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true,
    enum: ['FN', 'AN']
  },
  subject: {
    type: String,
    required: true
  },
  subjectCode: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['regular', 'supply'],
    default: 'regular'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create compound index for uniqueness
examScheduleSchema.index({ 
  date: 1, 
  time: 1, 
  subjectCode: 1, 
  department: 1, 
  semester: 1 
}, { unique: true });

export default mongoose.model('ExamSchedule', examScheduleSchema);