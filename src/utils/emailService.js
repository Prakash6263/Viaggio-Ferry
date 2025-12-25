const nodemailer = require("nodemailer")
const crypto = require("crypto")

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

const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex")
}

const sendVerificationLinkEmail = async (company, verificationToken) => {
  const transporter = createTransporter()

  const verificationUrl = `${process.env.BACKEND_URL || "https://api.voyagian.com"}/api/companies/confirm-verification/${verificationToken}`

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || "Admin"}" <${process.env.SMTP_USER}>`,
    to: company.emailAddress,
    subject: "Verify Your Company Registration",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #4CAF50; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
          .button:hover { background-color: #45a049; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Company</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${company.companyName}</strong>,</p>
            <p>Your company registration has been reviewed by our admin team. To complete the verification process, please click the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify My Company</a>
            </p>
            <p><strong>Company Details:</strong></p>
            <ul>
              <li><strong>Company Name:</strong> ${company.companyName}</li>
              <li><strong>Registration Number:</strong> ${company.registrationNumber}</li>
              <li><strong>Login Email:</strong> ${company.loginEmail}</li>
            </ul>
            <div class="warning">
              <strong>Note:</strong> This verification link will expire in 24 hours. If you did not request this verification, please ignore this email.
            </div>
            <p>If the button above doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;">${verificationUrl}</p>
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
    console.log("Verification link email sent:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending verification link email:", error)
    return { success: false, error: error.message }
  }
}

// Send company approval email (called after company clicks verification link)
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
          .footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
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

// Send OTP for forgot password
const sendForgotPasswordOTPEmail = async (email, otp, userName, userType = "user") => {
  const transporter = createTransporter()

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || "Admin"}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Password Reset OTP",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-box { background-color: #fff; border: 2px dashed #2196F3; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #2196F3; letter-spacing: 8px; }
          .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin-top: 15px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${userName}</strong>,</p>
            <p>We received a request to reset your password. Use the OTP code below to proceed with resetting your password:</p>
            <div class="otp-box">
              <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code</p>
              <p class="otp-code">${otp}</p>
              <p style="margin: 0; font-size: 12px; color: #999;">Valid for 15 minutes</p>
            </div>
            <div class="warning">
              <strong>Security Notice:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>This OTP will expire in 15 minutes</li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request a password reset, please ignore this email</li>
              </ul>
            </div>
            <p>To complete the password reset, you'll need to provide:</p>
            <ul>
              <li>This OTP code</li>
              <li>Your current password</li>
              <li>Your new password</li>
            </ul>
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
    console.log("Password reset OTP email sent:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending password reset OTP email:", error)
    return { success: false, error: error.message }
  }
}

// Send password reset success confirmation
const sendPasswordResetSuccessEmail = async (email, userName, userType = "user") => {
  const transporter = createTransporter()

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || "Admin"}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Password Successfully Reset",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .success-icon { text-align: center; font-size: 48px; color: #4CAF50; margin: 20px 0; }
          .warning { background-color: #ffebee; border: 1px solid #f44336; padding: 10px; border-radius: 5px; margin-top: 15px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Successful</h1>
          </div>
          <div class="content">
            <div class="success-icon">✓</div>
            <p>Dear <strong>${userName}</strong>,</p>
            <p>Your password has been successfully reset at <strong>${new Date().toLocaleString()}</strong>.</p>
            <p>You can now use your new password to log in to your account.</p>
            <div class="warning">
              <strong>Did you make this change?</strong>
              <p style="margin: 10px 0;">If you did not reset your password, please contact our support team immediately to secure your account.</p>
            </div>
            <p>For your security, we recommend:</p>
            <ul>
              <li>Use a strong, unique password</li>
              <li>Never share your password with anyone</li>
              <li>Change your password regularly</li>
            </ul>
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
    console.log("Password reset success email sent:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending password reset success email:", error)
    return { success: false, error: error.message }
  }
}

const sendContactReplyEmail = async (userEmail, userName, companyName, companyEmail, originalSubject, replyMessage) => {
  const transporter = createTransporter()

  const mailOptions = {
    from: `"${companyName}" <${process.env.SMTP_USER}>`,
    to: userEmail,
    replyTo: companyEmail,
    subject: `Re: ${originalSubject || "Inquiry to " + companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
          .header { border-bottom: 2px solid #2196F3; padding-bottom: 10px; margin-bottom: 20px; }
          .reply-content { background-color: #f9f9f9; padding: 20px; border-radius: 5px; white-space: pre-wrap; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Response from ${companyName}</h2>
          </div>
          <p>Dear ${userName},</p>
          <p>Thank you for reaching out to us. Here is the response to your inquiry:</p>
          <div class="reply-content">${replyMessage}</div>
          <p>Best regards,<br>${companyName}</p>
          <div class="footer">
            <p>This message was sent on behalf of ${companyName} via Voyagian.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log("[v0] Contact reply email sent:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("[v0] Error sending contact reply email:", error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail,
  sendVerificationLinkEmail,
  generateVerificationToken,
  sendForgotPasswordOTPEmail,
  sendPasswordResetSuccessEmail,
  sendContactReplyEmail, // Exported new function
}
