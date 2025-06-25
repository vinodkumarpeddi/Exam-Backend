import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
 
  role: { type: String, required: true, enum: ['student', 'invigilator', 'admin'] }
});

const Student = mongoose.model('Studentschema', userSchema);   // ✔ Variable name is Student
const Invigilator = mongoose.model('Invigilator', userSchema);
const Admin = mongoose.model('Admin', userSchema);

function getModelByRole(role) {
  if (role === 'student') return Student;      // ✔ Corrected
  if (role === 'invigilator') return Invigilator;
  if (role === 'admin') return Admin;
  return null;
}

export {
  Student,
  Invigilator,
  Admin,
  getModelByRole
};
