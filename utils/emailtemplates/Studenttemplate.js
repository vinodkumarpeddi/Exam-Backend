export const studentExamEmailTemplate = ({ name, date, time, roomNo, subject }) => `
  <div style="
    max-width:720px;
    margin:50px auto;
    padding:40px;
    background:linear-gradient(135deg, #fffdf9, #fff4e8);
    border-radius:24px;
    font-family:'Segoe UI', Roboto, sans-serif;
    color:#2c2c2c;
    border:1px solid #ffe0b2;
    box-shadow:0 12px 28px rgba(0, 0, 0, 0.06);
  ">

    <div style="text-align:center; margin-bottom:30px;">
      <h1 style="
        font-size:30px;
        color:#e65100;
        font-weight:700;
        letter-spacing:1px;
        margin-bottom:8px;
      ">
         Upcoming Exam Notification
      </h1>
      <p style="font-size:16.5px; color:#666;">
        Get ready for your upcoming examination. Stay sharp and prepared!
      </p>
    </div>

    <p style="font-size:17px;line-height:1.8;margin-bottom:25px;">
      Hello <strong style="color:#d84315;">${name}</strong>,
      <br/>
      Here's the schedule for your upcoming examination. Kindly go through the details below:
    </p>

    <div style="
      border:1px solid #ffe0b2;
      background:#fffdf6;
      border-radius:18px;
      overflow:hidden;
      box-shadow:inset 0 0 10px #fff3e0;
      margin-bottom:24px;
    ">
      <table style="width:100%;border-collapse:collapse;font-size:16px;">
        <tr style="background-color:#fff8f1;">
          <td style="padding:16px 22px;font-weight:600;color:#6d4c41;width:40%;"> Subject</td>
          <td style="padding:16px 22px;">${subject}</td>
        </tr>
        <tr>
          <td style="padding:16px 22px;font-weight:600;color:#6d4c41;"> Date</td>
          <td style="padding:16px 22px;">${date}</td>
        </tr>
        <tr style="background-color:#fff8f1;">
          <td style="padding:16px 22px;font-weight:600;color:#6d4c41;">Time</td>
          <td style="padding:16px 22px;">${time}</td>
        </tr>
        <tr>
          <td style="padding:16px 22px;font-weight:600;color:#6d4c41;"> Room No.</td>
          <td style="padding:16px 22px;">${roomNo}</td>
        </tr>
      </table>
    </div>

    <p style="font-size:16px; line-height:1.6; color:#444;">
       <strong>Arrive at least 15 minutes early</strong> to your exam center.<br/>
       Don’t forget to carry your valid college ID card and necessary materials.
    </p>

    <div style="margin-top:36px;text-align:center;">
      <p style="font-size:15.5px;color:#5e5e5e;">
        We believe in your hard work and dedication. Give it your best shot! 💪
      </p>
      <p style="font-size:14.5px;color:#777;margin-top:6px;">
        — Warm Regards, <br/><strong>Exam Coordination Team</strong>
      </p>
    </div>

    <hr style="margin:36px 0;border:none;border-top:1px solid #ffe3c3;" />

    <div style="text-align:center;">
      <small style="color:#999;font-size:13px;">
         This is an auto-generated email. If you have any queries, please reach out to your department office.
      </small>
    </div>
  </div>
`;
