import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import roomRoutes from './routes/roomRoutes.js';
import examScheduleRoutes from './routes/examScheduleRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import seatAllocationRoutes from './routes/seatAllocationRoutes.js';
import facultyAllocationRoutes from './routes/facultyAllocationRoutes.js';
import authRoutes from './routes/authRoutes.js'
import attendanceRoutes from './routes/attendanceRoutes.js';
import sendMailsRoutes from './routes/Sendmailsroute.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  'https://exam-seating-cgy3.vercel.app', // your frontend URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // if you're using cookies or auth headers
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/exam-schedules', examScheduleRoutes);
app.use('/api/students', studentRoutes);
app.use('/api', seatAllocationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/faculty-allocations', facultyAllocationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/send-mails', sendMailsRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Exam Seating Management System API is running',
    timestamp: new Date().toISOString()
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});