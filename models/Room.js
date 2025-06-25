import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  room_no: {
    type: String,
    required: true,
    unique: true
  },
  floor_no: {
    type: Number,
    required: true
  },
  block: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  room_type: {
    type: String,
    enum: ['classroom', 'lab', 'drawinghall'],
    required: true
  },
  isActive: {
    type: Boolean, 
    default: true
  },
  occupiedSlots: [
    {
      date: {
        type: Date,
        required: true
      },
      time: {
        type: String,
        enum: ['FN', 'AN'],
        required: true
      }
    }
  ]
}, {
  timestamps: true
});

export default mongoose.model('Room', roomSchema);
