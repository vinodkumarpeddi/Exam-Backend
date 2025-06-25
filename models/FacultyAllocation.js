import mongoose from 'mongoose';

const facultyAllocationSchema = new mongoose.Schema({
  facultyName: {
    type: String,
    required: true,
    trim: true
  },
  facultyId: {
    type: String,
    required: true,
    trim: true
  },
  designation: {
    type: String,
    required: true,
    enum: ['faculty', 'lab technician', 'Faculty', 'Lab Technician'],
    default: 'faculty'
  },
  role: {
    type: String,
    required: true,
    enum: ['invigilator', 'chief_invigilator', 'supervisor'],
    default: 'invigilator'
  },
  email:{
    type: String,
    required: true,
    trim: true,
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
  allocationDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ✅ Keep only this index
facultyAllocationSchema.index({ facultyId: 1, exam: 1 }, { unique: true });

export default mongoose.model('FacultyAllocation', facultyAllocationSchema);
