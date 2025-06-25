export const facultyAllocationEmailTemplate = ({ name, roomNo, date, time, designation }) => `
  <div style="max-width:700px;margin:40px auto;padding:36px;background:linear-gradient(135deg,#ffffff,#f0f4ff);border-radius:20px;box-shadow:0 20px 40px rgba(0,0,0,0.08);font-family:'Segoe UI',Roboto,sans-serif;color:#2c3e50;">
    <div style="text-align:center;margin-bottom:30px;">
      <img src="https://media.collegedekho.com/media/img/institute/logo/au_logo_footer.81a35955747a9db6666b.png" alt="Exam Notification" style="width:200px;height:200px;">
      <h1 style="font-size:26px;margin:14px 0;color:#1a237e;">🎓 Examination Duty Alert</h1>
      <span style="display:inline-block;background:#e8f0fe;color:#1a73e8;padding:6px 16px;border-radius:16px;font-size:14px;font-weight:500;">
        ${designation}
      </span>
    </div>

    <p style="font-size:17px;line-height:1.8;margin:20px 0;">
      Dear <strong style="color:#0d47a1;">Prof. ${name}</strong>,
    </p>

    <p style="font-size:16px;line-height:1.7;margin-bottom:28px;">
      You have been assigned <strong style="color:#43a047;">invigilation duty</strong> for the upcoming examination. Please find the details of your assignment below:
    </p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:15.5px;">
      <tr style="background:#e3f2fd;">
        <td style="padding:14px;border:1px solid #cfd8dc;font-weight:bold;">📅 Date</td>
        <td style="padding:14px;border:1px solid #cfd8dc;">${date}</td>
      </tr>
      <tr style="background:#ffffff;">
        <td style="padding:14px;border:1px solid #cfd8dc;font-weight:bold;">⏰ Time</td>
        <td style="padding:14px;border:1px solid #cfd8dc;">${time}</td>
      </tr>
      <tr style="background:#e3f2fd;">
        <td style="padding:14px;border:1px solid #cfd8dc;font-weight:bold;">🏫 Room No.</td>
        <td style="padding:14px;border:1px solid #cfd8dc;">${roomNo}</td>
      </tr>
    </table>

    <div style="padding:18px;background:#fff3e0;border-left:6px solid #fb8c00;border-radius:10px;margin-bottom:30px;">
      <p style="margin:0;font-size:15.5px;color:#e65100;">
        ⚠️ <strong>Note:</strong> Please report to the examination room at least <strong>15 minutes</strong> before the scheduled time. Your punctuality is essential.
      </p>
    </div>

    <p style="font-size:15.5px;line-height:1.6;">
      For any clarifications, feel free to contact the <strong>Exam Cell Coordination Team</strong>.
    </p>

    <div style="margin-top:40px;padding-top:20px;border-top:1px dashed #b0bec5;text-align:center;">
      <p style="font-size:15px;color:#607d8b;margin-bottom:6px;">Warm regards,</p>
      <p style="font-size:16px;font-weight:bold;color:#1a237e;margin:0;">📘 Exam Cell Coordination Team</p>
      <p style="font-size:13px;color:#9e9e9e;margin-top:8px;">(This is an automated message. Please do not reply.)</p>
    </div>
  </div>
`;
