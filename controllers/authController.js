import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { getModelByRole, Student, Invigilator, Admin } from '../models/index.js';
import { Model } from 'mongoose';

dotenv.config();

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.userId,
      name: user.name,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

export const login = async (req, res) => {
  try {
    const { role, userId, password } = req.body;
    console.log("Incoming login request:", { role, userId });

    const Model = getModelByRole(role);
    if (!Model) {
      console.log("Invalid role:", role);
      return res.status(400).json({ success: false, msg: 'Invalid role' });
    }

    const user = await Model.findOne({ userId });
    if (!user) {
      console.log("User not found for ID:", userId);
      return res.status(404).json({ success: false, msg: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password mismatch for:", userId);
      return res.status(401).json({ success: false, msg: 'Invalid credentials' });
    }

    const token = generateToken(user);
    console.log("JWT generated:", token);

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 
    });

    res.json({
      success: true,
      user: {
        name: user.name,
        userId: user.userId,
        role
      }
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, msg: 'Server error', error: err.message });
  }
};

export const addUser = async (req, res) => {
  try {
    const { role, userId, name, password } = req.body;

    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ success: false, msg: 'Invalid role' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new Model({
      userId,
      name,
      password: hashed,
      role
    });

    await newUser.save();
    res.json({ success: true, msg: 'User added successfully' });
  } catch (err) {
    if (err.code === 11000) {
      
      if (err.keyValue && err.keyValue.userId) {
        return res.status(400).json({ success: false, msg: 'User ID already exists' });
      }
     
      return res.status(400).json({ success: false, msg: 'Duplicate value for a unique field' });
    }

    console.error('Add user error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
};



export const changePassword = async (req, res) => {
  const { role, userId, currentPassword, newPassword } = req.body;

  if (!role || !userId || !currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      msg: 'All fields are required'
    });
  }

  const Model = getModelByRole(role);
  if (!Model) {
    return res.status(400).json({
      success: false,
      msg: 'Invalid role specified'
    });
  }

  try {
    const user = await Model.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: 'User not found in the specified role'
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        msg: 'Current password is incorrect'
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({
      success: true,
      msg: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({
      success: false,
      msg: 'Server error during password change'
    });
  }
};

export const initAdmin = async (req, res) => {
  try {
    const existing = await Admin.findOne({ userId: 'admin' });
    if (existing) return res.send('Admin already exists.');

    const hashed = await bcrypt.hash('admin', 10);
    await Admin.create({ userId: 'admin', name: 'Admin', password: hashed, role: 'admin' });

    res.send('Admin created.');
  } catch (err) {
    res.status(500).send('Error creating admin');
  }
};

export const logout = (req, res) => {
  res.clearCookie('authToken');
  res.json({ success: true, msg: 'Logged out successfully' });
};

export const addMultipleUsers = async (req, res) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users)) return res.status(400).json({ msg: 'Invalid data' });

    const results = [];

    for (const user of users) {
      let { role, userId, name, password } = user;

      role = role?.toLowerCase(); 
      if (!role || !userId || !name || !password) {
        results.push({ userId: userId || 'N/A', status: 'Failed', msg: 'Missing required fields' });
        continue;
      }

      const Model = getModelByRole(role);
      if (!Model) {
        results.push({ userId, status: 'Failed', msg: 'Invalid role' });
        continue;
      }

      try {
        const existing = await Model.findOne({ userId });
        if (existing) {
          results.push({ userId, status: 'Skipped', msg: 'User already exists' });
          continue;
        }

        const hashed = await bcrypt.hash(password, 10);
        const newUser = new Model({ userId, name, password: hashed, role });
        await newUser.save();
        results.push({ userId, status: 'Success' });

      } catch (err) {
        results.push({ userId, status: 'Failed', msg: 'Error: ' + err.message });
      }
    }

    res.json({ success: true, msg: 'Bulk insertion completed', results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
};


export const exportUsers = async (req, res) => {
  const role = req.query.role;

  try {
    let users = [];

    if (role && role !== 'all') {
      const Model = getModelByRole(role);
      if (!Model) {
        return res.status(400).json({ msg: 'Invalid role specified' });
      }
      users = await Model.find().lean(); 
    } else {
      const [students, invigilators, admins] = await Promise.all([
       Student.find().lean(),
        Invigilator.find().lean(),
        Admin.find().lean()
      ]);

      const withRole = (data, role) => data.map(user => ({ ...user, role }));

      users = [
        ...withRole(students, 'student'),
        ...withRole(invigilators, 'invigilator'),
        ...withRole(admins, 'admin'),
      ];
    }

    res.json({ users });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ msg: 'Failed to fetch users' });
  }
};
