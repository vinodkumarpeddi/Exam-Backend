import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamSchedule',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  invigilator: {
    facultyId: {
      type: String,
      required: true
    },
    facultyName: {
      type: String,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    default: 'present'
  },
  malpractice: {
    reported: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      default: ''
    },
    reportedAt: {
      type: Date
    }
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  examDate: {
    type: Date,
    required: true
  },
  examTime: {
    type: String,
    enum: ['FN', 'AN'],
    required: true
  }
}, {
  timestamps: true
});

// Ensure unique attendance record per student per exam
attendanceSchema.index({ 
  student: 1, 
  exam: 1 
}, { unique: true });
export default mongoose.model('Attendance', attendanceSchema);