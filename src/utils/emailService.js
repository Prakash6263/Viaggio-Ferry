const nodemailer = require("nodemailer")

// Create reusable transporter using SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// Send company approval email
const sendApprovalEmail = async (company) => {
  const transporter = createTransporter()

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || "Admin"}" <${process.env.SMTP_USER}>`,
    to: company.emailAddress,
    subject: "Your Company Registration Has Been Approved",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Registration Approved!</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${company.companyName}</strong>,</p>
            <p>We are pleased to inform you that your company registration has been <strong>approved</strong>.</p>
            <p>You can now log in to your account and start using our services.</p>
            <p><strong>Registration Details:</strong></p>
            <ul>
              <li><strong>Company Name:</strong> ${company.companyName}</li>
              <li><strong>Registration Number:</strong> ${company.registrationNumber}</li>
              <li><strong>Login Email:</strong> ${company.loginEmail}</li>
              <li><strong>Approved On:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
            <p>Best regards,<br>The Admin Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log("Approval email sent:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending approval email:", error)
    return { success: false, error: error.message }
  }
}

// Send company rejection email
const sendRejectionEmail = async (company, rejectionReason) => {
  const transporter = createTransporter()

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || "Admin"}" <${process.env.SMTP_USER}>`,
    to: company.emailAddress,
    subject: "Your Company Registration Has Been Rejected",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .reason-box { background-color: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Registration Rejected</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${company.companyName}</strong>,</p>
            <p>We regret to inform you that your company registration has been <strong>rejected</strong>.</p>
            <div class="reason-box">
              <p><strong>Reason for Rejection:</strong></p>
              <p>${rejectionReason}</p>
            </div>
            <p><strong>Registration Details:</strong></p>
            <ul>
              <li><strong>Company Name:</strong> ${company.companyName}</li>
              <li><strong>Registration Number:</strong> ${company.registrationNumber}</li>
              <li><strong>Login Email:</strong> ${company.loginEmail}</li>
            </ul>
            <p>If you believe this decision was made in error or if you have additional documentation to support your registration, please contact our support team for further assistance.</p>
            <p>You may also submit a new registration application after addressing the issues mentioned above.</p>
            <p>Best regards,<br>The Admin Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log("Rejection email sent:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending rejection email:", error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail,
}
