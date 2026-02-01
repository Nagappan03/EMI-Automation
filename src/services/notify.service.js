import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.NOTIFY_EMAIL,
        pass: process.env.NOTIFY_EMAIL_APP_PASSWORD
    }
});

export async function sendNotification({ bank, amount, month, year }) {
    await transporter.sendMail({
        from: `"EMI Tracker" <${process.env.NOTIFY_EMAIL}>`,
        to: process.env.NOTIFY_RECIPIENTS,
        subject: `${bank} EMI Updated – ${month} ${year}`,
        html: `
      <p>EMI updated automatically.</p>
      <p><b>Bank:</b> ${bank}</p>
      <p><b>Amount:</b> ₹${amount}</p>
      <p>
        <a href="https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}">
          View Tracker
        </a>
      </p>
    `
    });
}