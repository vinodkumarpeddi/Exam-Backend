import express from 'express';
import Attendance from '../models/Attendance.js';
import nodemailer from 'nodemailer';

const router = express.Router();

// Email transporter setup
const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMail = async (to, subject, html) => {
  if (!to) return;
  const mailOptions = {
    from: `"Exam Cell" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };
  await gmailTransporter.sendMail(mailOptions);
};

// Helper to get emails (personal + college)
const getEmailsFromStudent = (student) => {
  const list = [];
  if (student?.email) list.push(student.email);
  if (student?.regNo) list.push(`${student.regNo}@aec.edu.in`);
  return list;
};

const getDateRange = (dateString) => {
  const start = new Date(dateString);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateString);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const isValidExamTime = (time) => ['FN', 'AN'].includes(time);

// Email Templates
const absenteeTemplate = (name, date, time) => `
  <div style="max-width: 600px; margin: auto; font-family: 'Arial', sans-serif; background: #ffffff; border: 1px solid #dce3ea; border-radius: 10px; padding: 32px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://media.collegedekho.com/media/img/institute/logo/au_logo_footer.81a35955747a9db6666b.png" alt="AEC Logo" width="200" />
      <h2 style="margin-top: 10px; font-size: 22px; color: #2c3e50;">Aditya Engineering College</h2>
      <p style="color: #6c757d; font-size: 14px;">Examination Cell Notification</p>
    </div>

    <div>
      <p style="font-size: 16px; color: #2c3e50; margin-bottom: 20px;">Dear <strong>${name}</strong>,</p>

      <p style="font-size: 15px; color: #444; line-height: 1.6;">
        We would like to inform you that you were <strong style="color: #e74c3c;">absent</strong> for your examination held on 
        <strong>${date}</strong> during the <strong>${time}</strong> session.
      </p>

      <p style="font-size: 14px; color: #555; margin-top: 16px;">
        If this was recorded in error or you have a valid justification, please reach out to the Examination Cell at the earliest.
      </p>

      <div style="margin-top: 28px; text-align: center;">
        <a href="mailto:examcell@aec.edu.in" style="
          background-color: #0066cc;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 14px;
        ">Contact Exam Cell</a>
      </div>
    </div>

    <hr style="margin: 40px 0; border: none; border-top: 1px solid #eaeaea;" />

    <footer style="font-size: 12px; color: #888; text-align: center;">
      This is an automated message from the AEC Examination Cell. Please do not reply to this email.
    </footer>
  </div>
`;




const malpracticeTemplate = (name, date, time, reason) => `
  <div style="max-width: 600px; margin: auto; font-family: 'Arial', sans-serif; background: #ffffff; border: 1px solid #f0dcdc; border-radius: 10px; padding: 32px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://media.collegedekho.com/media/img/institute/logo/au_logo_footer.81a35955747a9db6666b.png" alt="AEC Logo" width="200" />
      <h2 style="margin-top: 10px; font-size: 22px; color: #b03030;">Aditya Engineering College</h2>
      <p style="color: #aa4a4a; font-size: 14px;">Malpractice Alert</p>
    </div>

    <div>
      <p style="font-size: 16px; color: #2c3e50; margin-bottom: 20px;">Dear <strong>${name}</strong>,</p>

      <p style="font-size: 15px; color: #444; line-height: 1.6;">
        A <strong style="color: #e74c3c;">malpractice</strong> case has been reported for your exam on 
        <strong>${date}</strong> during the <strong>${time}</strong> session.
      </p>

      <p style="font-size: 14px; color: #555; margin-top: 16px;">
        <strong>Remarks:</strong> ${reason}
      </p>

      <p style="font-size: 14px; color: #555; margin-top: 16px;">
        You are advised to contact your Head of Department immediately to discuss further.
      </p>

      <div style="margin-top: 28px; text-align: center;">
        <a href="mailto:examcell@aec.edu.in" style="
          background-color: #c0392b;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 14px;
        ">Contact Exam Cell</a>
      </div>
    </div>

    <hr style="margin: 40px 0; border: none; border-top: 1px solid #f5cfcf;" />

    <footer style="font-size: 12px; color: #aa4a4a; text-align: center;">
      This is a confidential notice issued by the AEC Examination Cell.
    </footer>
  </div>
`;

// Counts Route
router.post('/counts', async (req, res) => {
  try {
    const { examDate, examTime } = req.body;
    if (!examDate || !isValidExamTime(examTime)) return res.status(400).json({ message: 'Valid exam date and time required' });

    const { start, end } = getDateRange(examDate);

    const absentees = await Attendance.find({
      examDate: { $gte: start, $lte: end },
      examTime,
      status: 'absent',
    }).populate('student');

    const malpractice = await Attendance.find({
      examDate: { $gte: start, $lte: end },
      examTime,
      'malpractice.reported': true,
    }).populate('student');

    res.status(200).json({
      absentees: absentees.length,
      malpractice: malpractice.length,
      absenteeList: absentees.map((a) => ({
        name: a.student?.name,
        regNo: a.student?.regNo,
        email: a.student?.email,
      })),
      malpracticeList: malpractice.map((m) => ({
        name: m.student?.name,
        regNo: m.student?.regNo,
        email: m.student?.email,
        reason: m.malpractice?.description || 'Not specified',
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch counts' });
  }
});

// Absentee Email Notification
router.post('/absentees', async (req, res) => {
  try {
    const { examDate, examTime } = req.body;
    if (!examDate || !isValidExamTime(examTime)) return res.status(400).json({ message: 'Valid exam date and time required' });

    const { start, end } = getDateRange(examDate);

    const absentees = await Attendance.find({
      examDate: { $gte: start, $lte: end },
      examTime,
      status: 'absent',
    }).populate('student');

    if (absentees.length === 0) return res.status(200).json({ message: 'No absentees to notify' });

    await Promise.all(
      absentees.map(async (record) => {
        const emails = getEmailsFromStudent(record.student);
        if (emails.length > 0) {
          try {
            await sendMail(
              emails.join(','),
              'Absentee Notification',
              absenteeTemplate(record.student.name, record.examDate.toDateString(), examTime)
            );
          } catch (err) {
            console.error(`Failed to send absentee email to ${emails.join(',')}:`, err.message);
          }
        }
      })
    );

    res.status(200).json({ message: 'Absentee emails sent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send absentee emails' });
  }
});

// Malpractice Email Notification
router.post('/malpractice', async (req, res) => {
  try {
    const { examDate, examTime } = req.body;
    if (!examDate || !isValidExamTime(examTime)) return res.status(400).json({ message: 'Valid exam date and time required' });

    const { start, end } = getDateRange(examDate);

    const records = await Attendance.find({
      examDate: { $gte: start, $lte: end },
      examTime,
      'malpractice.reported': true,
    }).populate('student');

    if (records.length === 0) return res.status(200).json({ message: 'No malpractice records to notify' });

    await Promise.all(
      records.map(async (record) => {
        const emails = getEmailsFromStudent(record.student);
        if (emails.length > 0) {
          try {
            await sendMail(
              emails.join(','),
              'Malpractice Notification',
              malpracticeTemplate(
                record.student.name,
                record.examDate.toDateString(),
                examTime,
                record.malpractice?.description || 'Not specified'
              )
            );
          } catch (err) {
            console.error(`Failed to send malpractice email to ${emails.join(',')}:`, err.message);
          }
        }
      })
    );

    res.status(200).json({ message: 'Malpractice emails sent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send malpractice emails' });
  }
});

// Combined Email Sending Route
router.post('/', async (req, res) => {
  try {
    const { examDate, examTime } = req.body;
    if (!examDate || !isValidExamTime(examTime)) return res.status(400).json({ message: 'Valid exam date and time required' });

    const { start, end } = getDateRange(examDate);

    const absentees = await Attendance.find({
      examDate: { $gte: start, $lte: end },
      examTime,
      status: 'absent',
    }).populate('student');

    const malpractice = await Attendance.find({
      examDate: { $gte: start, $lte: end },
      examTime,
      'malpractice.reported': true,
    }).populate('student');

    await Promise.all([
      ...absentees.map(async (record) => {
        const emails = getEmailsFromStudent(record.student);
        if (emails.length > 0) {
          try {
            await sendMail(
              emails.join(','),
              'Absentee Notification',
              absenteeTemplate(record.student.name, record.examDate.toDateString(), examTime)
            );
          } catch (err) {
            console.error(`Failed to send absentee email to ${emails.join(',')}:`, err.message);
          }
        }
      }),
      ...malpractice.map(async (record) => {
        const emails = getEmailsFromStudent(record.student);
        if (emails.length > 0) {
          try {
            await sendMail(
              emails.join(','),
              'Malpractice Notification',
              malpracticeTemplate(
                record.student.name,
                record.examDate.toDateString(),
                examTime,
                record.malpractice?.description || 'Not specified'
              )
            );
          } catch (err) {
            console.error(`Failed to send malpractice email to ${emails.join(',')}:`, err.message);
          }
        }
      }),
    ]);

    res.status(200).json({ message: 'All emails sent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send emails' });
  }
});

export default router;
