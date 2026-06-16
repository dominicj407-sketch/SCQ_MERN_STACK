const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'dominicj407@gmail.com',
        pass: process.env.EMAIL_PASS || ''
    }
});

async function sendEmail(to, subject, html) {
    try {
        const info = await transporter.sendMail({
            from: `"SmartCareQ" <${process.env.EMAIL_USER || 'smartcarequeue@gmail.com'}>`,
            to,
            subject,
            html
        });
        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (err) {
        console.error(`📧 Email failed to ${to}:`, err.message);
        
        return null;
    }
}

function buildPositionOneEmail(patientName, doctorName, tokenNumber) {
    return `
    <div style="font-family:'Segoe UI',sans-serif;max-width:500px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="margin:0;font-size:28px;">🏥 SmartCareQ</h1>
            <p style="margin:8px 0 0 0;opacity:0.9;">Queue Notification</p>
        </div>
        <div style="background:white;padding:30px;border:1px solid #eee;border-radius:0 0 12px 12px;">
            <h2 style="color:#2e7d32;margin:0 0 16px 0;">🎉 You're NEXT!</h2>
            <p style="color:#333;font-size:16px;line-height:1.6;">
                Hello <strong>${patientName}</strong>,
            </p>
            <p style="color:#555;font-size:15px;line-height:1.6;">
                You are now at <strong style="color:#1565c0;">Position #1</strong> in the queue for
                <strong>Dr. ${doctorName}</strong>.
            </p>
            <div style="background:#e8f5e9;border-radius:10px;padding:20px;text-align:center;margin:20px 0;">
                <p style="color:#555;margin:0 0 6px 0;font-size:13px;">Your Token Number</p>
                <p style="font-size:48px;font-weight:900;color:#1b5e20;margin:0;">#${tokenNumber}</p>
            </div>
            <div style="background:#fff3e0;border-left:4px solid #ff9800;padding:14px;border-radius:4px;margin:16px 0;">
                <p style="margin:0;color:#e65100;font-weight:600;">⚠️ Please be ready!</p>
                <p style="margin:4px 0 0 0;color:#666;font-size:14px;">
                    Scan your QR code at the front desk within <strong>2 minutes</strong> when called,
                    or you may be moved to the skipped queue.
                </p>
            </div>
            <p style="color:#999;font-size:12px;text-align:center;margin:20px 0 0 0;">
                This is an automated notification from SmartCareQ
            </p>
        </div>
    </div>`;
}

function buildBookingEmail(patientName, doctorName, tokenNumber, date) {
    return `
    <div style="font-family:'Segoe UI',sans-serif;max-width:500px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#00c6ff 0%,#0072ff 100%);color:white;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="margin:0;font-size:28px;">🏥 SmartCareQ</h1>
            <p style="margin:8px 0 0 0;opacity:0.9;">Appointment Booking Confirmation</p>
        </div>
        <div style="background:white;padding:30px;border:1px solid #eee;border-radius:0 0 12px 12px;">
            <h2 style="color:#0072ff;margin:0 0 16px 0;">🎉 Booking Confirmed!</h2>
            <p style="color:#333;font-size:16px;line-height:1.6;">
                Hello <strong>${patientName}</strong>,
            </p>
            <p style="color:#555;font-size:15px;line-height:1.6;">
                Your appointment with <strong>Dr. ${doctorName}</strong> has been successfully booked for <strong>${date}</strong>.
            </p>
            <div style="background:#e3f2fd;border-radius:10px;padding:20px;text-align:center;margin:20px 0;">
                <p style="color:#555;margin:0 0 6px 0;font-size:13px;">Your Token Number</p>
                <p style="font-size:48px;font-weight:900;color:#0d47a1;margin:0;">#${tokenNumber}</p>
            </div>
            <div style="background:#f9f9f9;border-left:4px solid #0072ff;padding:14px;border-radius:4px;margin:16px 0;">
                <p style="margin:0;color:#333;font-weight:600;">📅 Appointment Details</p>
                <p style="margin:4px 0 0 0;color:#666;font-size:14px;">
                    Please arrive on time. You can scan your booking QR code at the clinic front desk to check-in when you arrive.
                </p>
            </div>
            <p style="color:#999;font-size:12px;text-align:center;margin:20px 0 0 0;">
                This is an automated notification from SmartCareQ
            </p>
        </div>
    </div>`;
}

function buildCompletionEmail(patientName, doctorName, prescriptionText, prescriptionUrl) {
    const showPrescription = prescriptionText || prescriptionUrl;
    return `
    <div style="font-family:'Segoe UI',sans-serif;max-width:500px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#11998e 0%,#38ef7d 100%);color:white;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="margin:0;font-size:28px;">🏥 SmartCareQ</h1>
            <p style="margin:8px 0 0 0;opacity:0.9;">Consultation Completed</p>
        </div>
        <div style="background:white;padding:30px;border:1px solid #eee;border-radius:0 0 12px 12px;">
            <h2 style="color:#2e7d32;margin:0 0 16px 0;">✅ Session Completed</h2>
            <p style="color:#333;font-size:16px;line-height:1.6;">
                Hello <strong>${patientName}</strong>,
            </p>
            <p style="color:#555;font-size:15px;line-height:1.6;">
                Your consultation with <strong>Dr. ${doctorName}</strong> is complete. We hope you are doing well!
            </p>
            ${showPrescription ? `
            <div style="background:#f1f8e9;border-radius:10px;padding:20px;margin:20px 0;">
                <h3 style="color:#2e7d32;margin:0 0 10px 0;font-size:16px;">📋 Prescription & Notes</h3>
                ${prescriptionText ? `<p style="color:#333;font-size:14px;line-height:1.6;margin:0 0 10px 0;white-space:pre-wrap;">${prescriptionText}</p>` : ''}
                ${prescriptionUrl ? `
                <div style="text-align:center;margin-top:15px;">
                    <a href="${prescriptionUrl}" target="_blank" style="background:#2e7d32;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;font-weight:bold;font-size:14px;display:inline-block;">View Prescription File</a>
                </div>` : ''}
            </div>` : ''}
            <p style="color:#999;font-size:12px;text-align:center;margin:20px 0 0 0;">
                This is an automated notification from SmartCareQ
            </p>
        </div>
    </div>`;
}

function buildSkippedEmail(patientName, doctorName) {
    return `
    <div style="font-family:'Segoe UI',sans-serif;max-width:500px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#ff9900 0%,#ff5500 100%);color:white;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="margin:0;font-size:28px;">🏥 SmartCareQ</h1>
            <p style="margin:8px 0 0 0;opacity:0.9;">Queue Status Alert</p>
        </div>
        <div style="background:white;padding:30px;border:1px solid #eee;border-radius:0 0 12px 12px;">
            <h2 style="color:#d32f2f;margin:0 0 16px 0;">⚠️ You Have Been Skipped</h2>
            <p style="color:#333;font-size:16px;line-height:1.6;">
                Hello <strong>${patientName}</strong>,
            </p>
            <p style="color:#555;font-size:15px;line-height:1.6;">
                You were skipped for your appointment with <strong>Dr. ${doctorName}</strong> because you were not present when called.
            </p>
            <div style="background:#fff3e0;border-left:4px solid #ff9800;padding:14px;border-radius:4px;margin:16px 0;">
                <p style="margin:0;color:#e65100;font-weight:600;">How to rejoin:</p>
                <p style="margin:4px 0 0 0;color:#666;font-size:14px;">
                    Please scan your QR code at the clinic front desk. You will be rejoined at the **top** of the waiting queue.
                </p>
            </div>
            <p style="color:#999;font-size:12px;text-align:center;margin:20px 0 0 0;">
                This is an automated notification from SmartCareQ
            </p>
        </div>
    </div>`;
}

function buildQueueCancelledEmail(patientName, doctorName) {
    return `
    <div style="font-family:'Segoe UI',sans-serif;max-width:500px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#e53935 0%,#b71c1c 100%);color:white;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="margin:0;font-size:28px;">🏥 SmartCareQ</h1>
            <p style="margin:8px 0 0 0;opacity:0.9;">Queue Cancellation Alert</p>
        </div>
        <div style="background:white;padding:30px;border:1px solid #eee;border-radius:0 0 12px 12px;">
            <h2 style="color:#d32f2f;margin:0 0 16px 0;">⚠️ Queue Cancelled</h2>
            <p style="color:#333;font-size:16px;line-height:1.6;">
                Hello <strong>${patientName}</strong>,
            </p>
            <p style="color:#555;font-size:15px;line-height:1.6;">
                We apologize for the inconvenience. <strong>Dr. ${doctorName}</strong> has had to cancel today's queue.
            </p>
            <div style="background:#ffebee;border-left:4px solid #f44336;padding:14px;border-radius:4px;margin:16px 0;">
                <p style="margin:0;color:#c62828;font-weight:600;">Refund Status:</p>
                <p style="margin:4px 0 0 0;color:#555;font-size:14px;">
                    A full refund of your consultation fee has been initiated to your original payment method.
                </p>
            </div>
            <p style="color:#999;font-size:12px;text-align:center;margin:20px 0 0 0;">
                This is an automated notification from SmartCareQ
            </p>
        </div>
    </div>`;
}

function buildEmergencyPriorityEmail(patientName, tokenNumber) {
    return `
    <div style="font-family:'Segoe UI',sans-serif;max-width:500px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#d32f2f 0%,#c62828 100%);color:white;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="margin:0;font-size:28px;">🏥 SmartCareQ</h1>
            <p style="margin:8px 0 0 0;opacity:0.9;">Emergency Priority Alert</p>
        </div>
        <div style="background:white;padding:30px;border:1px solid #eee;border-radius:0 0 12px 12px;">
            <h2 style="color:#d32f2f;margin:0 0 16px 0;">🚨 Emergency Priority Flagged</h2>
            <p style="color:#333;font-size:16px;line-height:1.6;">
                Hello <strong>${patientName}</strong>,
            </p>
            <p style="color:#555;font-size:15px;line-height:1.6;">
                Your appointment (Token #${tokenNumber}) has been flagged for **EMERGENCY** priority.
            </p>
            <div style="background:#ffebee;border-left:4px solid #f44336;padding:14px;border-radius:4px;margin:16px 0;">
                <p style="margin:0;color:#c62828;font-weight:600;">Please proceed immediately:</p>
                <p style="margin:4px 0 0 0;color:#555;font-size:14px;">
                    Please proceed directly to the doctor's room.
                </p>
            </div>
            <p style="color:#999;font-size:12px;text-align:center;margin:20px 0 0 0;">
                This is an automated notification from SmartCareQ
            </p>
        </div>
    </div>`;
}

function buildQueuePushedEmail(patientName) {
    return `
    <div style="font-family:'Segoe UI',sans-serif;max-width:500px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#ff9800 0%,#f57c00 100%);color:white;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="margin:0;font-size:28px;">🏥 SmartCareQ</h1>
            <p style="margin:8px 0 0 0;opacity:0.9;">Queue Update Alert</p>
        </div>
        <div style="background:white;padding:30px;border:1px solid #eee;border-radius:0 0 12px 12px;">
            <h2 style="color:#e65100;margin:0 0 16px 0;">⏳ Estimated Wait Time Increased</h2>
            <p style="color:#333;font-size:16px;line-height:1.6;">
                Hello <strong>${patientName}</strong>,
            </p>
            <p style="color:#555;font-size:15px;line-height:1.6;">
                Due to an unexpected medical emergency, your estimated wait time has increased by approximately 15 minutes.
            </p>
            <p style="color:#555;font-size:15px;line-height:1.6;">
                We appreciate your patience and cooperation as we prioritize critical care.
            </p>
            <p style="color:#999;font-size:12px;text-align:center;margin:20px 0 0 0;">
                This is an automated notification from SmartCareQ
            </p>
        </div>
    </div>`;
}

function buildMasterPasswordEmail(name, role, masterPassword) {
    return `
    <div style="font-family:'Segoe UI',sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#f8fafc;border-radius:16px;box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:35px 30px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:-0.025em;">🏥 SmartCareQ</h1>
            <p style="margin:8px 0 0 0;opacity:0.9;font-size:15px;">Your Unique Master Password</p>
        </div>
        <div style="background:white;padding:35px 30px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
            <h2 style="color:#2d3748;margin:0 0 16px 0;font-size:20px;font-weight:700;">Registration Successful!</h2>
            <p style="color:#4a5568;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
                Hello <strong>${name}</strong>,
            </p>
            <p style="color:#4a5568;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
                You have been registered successfully as a <strong>${role}</strong> on SmartCareQ. Below is your unique **Master Password** (recovery key). Please save this code securely. If you ever forget your password, you will need to input this code to change it.
            </p>
            <div style="background:#f3e5f5;border-radius:10px;padding:24px 20px;text-align:center;margin:24px 0;border:1px dashed #ab47bc;">
                <p style="color:#7b1fa2;margin:0 0 6px 0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Your Master Password Recovery Key</p>
                <p style="font-size:36px;font-weight:900;color:#4a148c;margin:0;letter-spacing:2px;font-family:monospace;">${masterPassword}</p>
            </div>
            <p style="color:#718096;font-size:12px;line-height:1.5;margin:20px 0 0 0;border-top:1px solid #edf2f7;padding-top:16px;">
                ⚠️ <strong>Do not share this key with anyone.</strong> Support staff will never ask for your recovery key.
            </p>
            <p style="color:#a0aec0;font-size:11px;text-align:center;margin:24px 0 0 0;">
                This is an automated notification from SmartCareQ
            </p>
        </div>
    </div>`;
}

module.exports = {
    sendEmail,
    buildPositionOneEmail,
    buildBookingEmail,
    buildCompletionEmail,
    buildSkippedEmail,
    buildQueueCancelledEmail,
    buildEmergencyPriorityEmail,
    buildQueuePushedEmail,
    buildMasterPasswordEmail
};


