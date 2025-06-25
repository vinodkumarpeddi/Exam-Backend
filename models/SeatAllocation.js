import mongoose from 'mongoose';

const seatAllocationSchema = new mongoose.Schema({
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
  seatNumber: {
    type: String,
    required: true
  },
  allocationDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure unique seat allocation per exam and room
seatAllocationSchema.index({ 
  exam: 1, 
  room: 1, 
  seatNumber: 1 
}, { unique: true });

// Ensure one student per exam
seatAllocationSchema.index({ 
  student: 1, 
  exam: 1 
}, { unique: true });

export default mongoose.model('SeatAllocation', seatAllocationSchema);