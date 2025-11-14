const nodemailer = require('nodemailer');

// Email templates
const emailTemplates = {
  'verify-account': {
    subject: 'Verify Your MargSetu Authority Account',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to MargSetu!</h1>
        <p>Hello ${data.name},</p>
        <p>Thank you for registering with MargSetu. Please click the button below to verify your account:</p>
        <a href="${data.verificationUrl}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Verify Account
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all;">${data.verificationUrl}</p>
        <p>This verification link will expire in 24 hours.</p>
        <p>If you didn't create this account, please ignore this email.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated email from MargSetu Public Transport System.
        </p>
      </div>
    `
  },
  
  'password-reset': {
    subject: 'Password Reset Request - MargSetu',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Password Reset Request</h1>
        <p>Hello ${data.name},</p>
        <p>We received a request to reset your password for your MargSetu account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${data.resetUrl}" 
           style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all;">${data.resetUrl}</p>
        <p>This reset link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated email from MargSetu Public Transport System.
        </p>
      </div>
    `
  },

  'bus-alert': {
    subject: 'Bus Alert Notification - MargSetu',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f59e0b;">Bus Alert</h1>
        <p>Alert Type: <strong>${data.alertType}</strong></p>
        <p>Bus ID: <strong>${data.busId}</strong></p>
        <p>Location: ${data.location}</p>
        <p>Time: ${data.timestamp}</p>
        <p>Description: ${data.description}</p>
        ${data.priority === 'high' ? '<p style="color: #dc2626; font-weight: bold;">⚠️ HIGH PRIORITY ALERT</p>' : ''}
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          MargSetu Alert System - Automated Notification
        </p>
      </div>
    `
  },

  'driver-notification': {
    subject: 'Driver Notification - MargSetu',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Driver Notification</h1>
        <p>Hello ${data.driverName},</p>
        <p>${data.message}</p>
        ${data.actionRequired ? `
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Action Required:</p>
            <p style="margin: 5px 0 0 0;">${data.actionRequired}</p>
          </div>
        ` : ''}
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          MargSetu Driver Communication System
        </p>
      </div>
    `
  }
};

// Create email transporter
const createTransporter = () => {
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else if (process.env.EMAIL_SERVICE === 'smtp') {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });
  } else {
    // Default to console logging for development
    return {
      sendMail: async (options) => {
        console.log('📧 Email would be sent:');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Content:', options.html || options.text);
        return { messageId: 'dev-email-' + Date.now() };
      }
    };
  }
};

// Send email function
const sendEmail = async (options) => {
  try {
    const { to, subject, template, data, html, text } = options;

    let emailHtml = html;
    let emailSubject = subject;

    // Use template if provided
    if (template && emailTemplates[template]) {
      emailHtml = emailTemplates[template].html(data);
      emailSubject = emailSubject || emailTemplates[template].subject;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"MargSetu" <${process.env.EMAIL_FROM || 'noreply@margsetu.com'}>`,
      to,
      subject: emailSubject,
      html: emailHtml,
      text: text || emailHtml?.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return result;

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw error;
  }
};

// Send bulk emails
const sendBulkEmails = async (recipients) => {
  const results = [];
  const errors = [];

  for (const recipient of recipients) {
    try {
      const result = await sendEmail(recipient);
      results.push({ 
        email: recipient.to, 
        status: 'sent', 
        messageId: result.messageId 
      });
    } catch (error) {
      errors.push({ 
        email: recipient.to, 
        status: 'failed', 
        error: error.message 
      });
    }
  }

  return {
    totalSent: results.length,
    totalFailed: errors.length,
    results,
    errors
  };
};

// Send notification email to authorities
const sendAuthorityAlert = async (alertData) => {
  const authorities = await require('../models/Authority').find({ 
    role: { $in: ['admin', 'supervisor'] },
    isVerified: true,
    accountStatus: 'active'
  });

  const recipients = authorities.map(authority => ({
    to: authority.email,
    template: 'bus-alert',
    data: alertData
  }));

  return await sendBulkEmails(recipients);
};

// Send driver notification
const sendDriverNotification = async (driverId, notificationData) => {
  const driver = await require('../models/Driver').findOne({ driverId }).populate('user');
  
  if (!driver || !driver.user?.email) {
    throw new Error('Driver email not found');
  }

  return await sendEmail({
    to: driver.user.email,
    template: 'driver-notification',
    data: {
      driverName: driver.name,
      ...notificationData
    }
  });
};

// Email verification status check
const verifyEmailService = async () => {
  try {
    const transporter = createTransporter();
    
    if (transporter.verify) {
      await transporter.verify();
      console.log('✅ Email service is configured and ready');
      return true;
    }
    
    return true; // For dev mode
  } catch (error) {
    console.error('❌ Email service verification failed:', error.message);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  sendAuthorityAlert,
  sendDriverNotification,
  verifyEmailService,
  emailTemplates
};