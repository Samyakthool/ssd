// Vercel Serverless Function: /api/send-email
// Handles direct automated email dispatch from samyak.ssd@gmail.com via Nodemailer Gmail SMTP
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { type, recipientEmail, recipientName, data, appPassword, resendApiKey } = req.body || {};

    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'Recipient email is required.' });
    }

    const timestamp = new Date().toISOString();
    const dispatchId = 'disp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const gmailAppPassword = (process.env.GMAIL_APP_PASSWORD || appPassword || '').trim().replace(/\s+/g, '');
    const resendKey = (process.env.RESEND_API_KEY || resendApiKey || '').trim();
    const senderEmail = process.env.SENDER_EMAIL || 'samyak.ssd@gmail.com';
    const senderName = 'Samata Sainik Dal (SSD)';

    const isDonation = type === 'donation';
    const isApproval = type === 'approval';
    const subject = isDonation
      ? `Official 80G Contribution Receipt - Samata Sainik Dal [${data?.receiptNumber || 'SSD-REC-2026'}]`
      : isApproval
        ? `Official Sainik Enlistment Verified & Approved - Samata Sainik Dal [${data?.enlistmentId || 'SSD-CADET-2026'}]`
        : `Official Cadet Enlistment Confirmed - Samata Sainik Dal [${data?.enlistmentId || 'SSD-CADET-2026'}]`;

    const html = isDonation
      ? generateDonationReceiptHtml(data)
      : isApproval
        ? generateApprovalEmailHtml(data)
        : generateEnrollmentWelcomeHtml(data);

    // 1. If Resend API Key is provided, dispatch via Resend
    if (resendKey) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Samata Sainik Dal <onboarding@resend.dev>',
            reply_to: senderEmail,
            to: [recipientEmail],
            subject: subject,
            html: html
          })
        });

        const resendData = await resendRes.json();
        if (resendData && resendData.id) {
          return res.status(200).json({
            success: true,
            provider: 'Resend API',
            messageId: resendData.id,
            dispatchId: dispatchId,
            recipient: recipientEmail,
            status: 'Delivered to Inbox'
          });
        }
      } catch (rErr) {
        console.warn('Resend error:', rErr);
      }
    }

    // 2. If Gmail App Password is provided, send real email directly via Nodemailer Gmail SMTP
    if (gmailAppPassword) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: senderEmail,
            pass: gmailAppPassword
          }
        });

        const mailOptions = {
          from: `"${senderName}" <${senderEmail}>`,
          replyTo: senderEmail,
          to: recipientEmail,
          subject: subject,
          html: html
        };

        const info = await transporter.sendMail(mailOptions);

        return res.status(200).json({
          success: true,
          provider: 'Gmail SMTP (Nodemailer)',
          messageId: info.messageId,
          dispatchId: dispatchId,
          recipient: recipientEmail,
          status: 'Delivered to Inbox'
        });
      } catch (smtpErr) {
        console.error('Gmail SMTP error:', smtpErr);
        const isAuthFail = smtpErr.responseCode === 535 || (smtpErr.message && smtpErr.message.includes('535'));
        const errorMessage = isAuthFail
          ? 'Google Error 535: Username and password not accepted. You must use a 16-character Google App Password from https://myaccount.google.com/apppasswords (NOT your regular Gmail account password).'
          : (smtpErr.message || 'SMTP Authentication failed.');

        return res.status(500).json({
          success: false,
          provider: 'Gmail SMTP',
          error: errorMessage,
          dispatchId: dispatchId
        });
      }
    }

    // 2. Fallback: Log recorded dispatch
    return res.status(200).json({
      success: true,
      provider: 'Automated Dispatch Logger',
      dispatchId: dispatchId,
      type: type,
      recipient: recipientEmail,
      name: recipientName,
      timestamp: timestamp,
      status: 'Recorded. Add Gmail App Password in Admin Settings to deliver live emails directly.'
    });

  } catch (error) {
    console.error('Email API Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal Email API error' });
  }
}

function generateDonationReceiptHtml(data) {
  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
      <div style="background: #001f3f; padding: 24px; text-align: center; border-bottom: 4px solid #FF6B00;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px;">SAMATA SAINIK DAL (SSD)</h1>
        <p style="color: #FF6B00; margin: 6px 0 0; font-size: 13px; font-weight: bold;">CENTENARY MOVEMENT TRUST (1927–2027)</p>
      </div>
      <div style="padding: 24px; color: #1e293b;">
        <h2 style="color: #001f3f; margin-top: 0;">Official 80G Contribution Receipt</h2>
        <p>Dear <strong>${data?.name || data?.donorName || 'Supporter'}</strong>, Jai Bhim!</p>
        <p>Thank you for your generous contribution to Samata Sainik Dal. Your support empowers our nationwide constitutional literacy, youth cadet training, and community defense initiatives.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Receipt Number</td>
            <td style="padding: 10px; font-weight: bold; color: #001f3f;">${data?.receiptNumber || 'SSD-REC-2026'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Amount Contributed</td>
            <td style="padding: 10px; font-weight: bold; color: #16a34a; font-size: 16px;">₹${(Number(data?.amount) || 0).toLocaleString()}</td>
          </tr>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Transaction / Payment ID</td>
            <td style="padding: 10px; color: #FF6B00; font-family: monospace;">${data?.paymentId || 'pay_live'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Cause / Mission Fund</td>
            <td style="padding: 10px; color: #1e293b;">${data?.cause || 'Centenary Trust Fund'}</td>
          </tr>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Donor PAN</td>
            <td style="padding: 10px; color: #1e293b; font-family: monospace;">${data?.pan || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Date & Time</td>
            <td style="padding: 10px; color: #1e293b;">${new Date(data?.timestamp || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
          </tr>
        </table>

        <div style="background: #eff6ff; border-left: 4px solid #001f3f; padding: 12px; margin-top: 18px; font-size: 12.5px; color: #1e3a8a;">
          <strong>Tax Exemption Note:</strong> Contributions to Samata Sainik Dal are eligible for tax deduction under Section 80G of the Income Tax Act. Please retain this email for your tax records.
        </div>

        <p style="margin-top: 24px; font-size: 13px; color: #64748b; line-height: 1.5;">
          With revolutionary regards,<br>
          <strong>National Treasury & Audit Directorate</strong><br>
          Samata Sainik Dal Central Command, Nagpur HQ<br>
          <a href="https://ssdind.vercel.app" style="color: #FF6B00;">https://ssdind.vercel.app</a>
        </p>
      </div>
    </div>
  `;
}

function generateEnrollmentWelcomeHtml(data) {
  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
      <div style="background: #001f3f; padding: 24px; text-align: center; border-bottom: 4px solid #FF6B00;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px;">SAMATA SAINIK DAL (SSD)</h1>
        <p style="color: #FF6B00; margin: 6px 0 0; font-size: 13px; font-weight: bold;">ARMY OF SOLDIERS FOR EQUALITY (ESTD. 1927)</p>
      </div>
      <div style="padding: 24px; color: #1e293b;">
        <h2 style="color: #001f3f; margin-top: 0;">Official Cadet Enlistment Confirmation</h2>
        <p>Salute to Sainik <strong>${data?.name || data?.fullName || 'Cadet'}</strong>, Jai Bhim!</p>
        <p>Welcome to <strong>Samata Sainik Dal</strong>. Your official enlistment registration has been approved by Central Command. You are now part of the nationwide movement founded on 24 September 1927 by Bodhisattva Dr. B.R. Ambedkar.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Cadet Name</td>
            <td style="padding: 10px; font-weight: bold; color: #001f3f;">${data?.name || data?.fullName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Enlistment Reference</td>
            <td style="padding: 10px; color: #FF6B00; font-weight: bold; font-family: monospace;">${data?.enlistmentId || 'SSD-CADET-' + Math.floor(1000 + Math.random() * 9000)}</td>
          </tr>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Assigned Wing / Division</td>
            <td style="padding: 10px; font-weight: bold; color: #001f3f;">${data?.wing || 'Central Cadet Corps (Sainik Wing)'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">State / Command Unit</td>
            <td style="padding: 10px; color: #1e293b;">${data?.city ? data.city + ', ' + data.state : data?.state || 'India'}</td>
          </tr>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Date of Enlistment</td>
            <td style="padding: 10px; color: #1e293b;">${new Date(data?.timestamp || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
          </tr>
        </table>

        <div style="background: #fff7ed; border-left: 4px solid #FF6B00; padding: 14px; margin-top: 18px; font-size: 13px; color: #9a3412;">
          <h4 style="margin: 0 0 6px; color: #7c2d12;">SSD Cadet Creed:</h4>
          <em>"Educate, Agitate, Organize. We pledge our service to defend constitutional democracy, social equality, non-violent discipline, and brotherhood across the nation."</em>
        </div>

        <h3 style="color: #001f3f; margin-top: 24px; font-size: 15px;">Next Steps for New Sainiks:</h3>
        <ol style="font-size: 13.5px; color: #334155; line-height: 1.6; padding-left: 20px;">
          <li>Your District Cadet Commander will reach out via Phone/WhatsApp for local drill schedule and meeting details.</li>
          <li>Access official dispatches and historical circulars at <a href="https://ssdind.vercel.app/news-events" style="color: #FF6B00;">https://ssdind.vercel.app/news-events</a>.</li>
          <li>Participate in upcoming constitutional seminars and national centenary programs.</li>
        </ol>

        <p style="margin-top: 24px; font-size: 13px; color: #64748b; line-height: 1.5;">
          In national unity & solidarity,<br>
          <strong>Central Cadet Directorate & National Executive</strong><br>
          Samata Sainik Dal Headquarters, Nagpur<br>
          <a href="https://ssdind.vercel.app" style="color: #FF6B00;">https://ssdind.vercel.app</a>
        </p>
      </div>
    </div>
  `;
}

function generateApprovalEmailHtml(data) {
  const cadetName = data?.name || data?.fullName || 'Cadet Sainik';
  const enlistId = data?.enlistmentId || ('SSD-CADET-' + Math.floor(1000 + Math.random() * 9000));
  const wing = data?.wing || 'Central Cadet Corps (Sainik Wing)';
  const location = data?.city ? (data.city + ', ' + (data.state || 'India')) : (data?.state || 'National Command');
  const dateStr = new Date(data?.approvedAt || data?.timestamp || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
      <div style="background: #001f3f; padding: 26px; text-align: center; border-bottom: 4px solid #16a34a;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px;">SAMATA SAINIK DAL (SSD)</h1>
        <p style="color: #FF6B00; margin: 6px 0 0; font-size: 13px; font-weight: bold;">ARMY OF SOLDIERS FOR EQUALITY (ESTD. 1927)</p>
      </div>
      <div style="padding: 26px; color: #1e293b;">
        <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">🛡️</span>
          <div>
            <strong style="color: #15803d; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Enlistment Status: Officially Approved & Verified</strong>
            <div style="color: #166534; font-size: 12px;">Central Command Credentials Validated</div>
          </div>
        </div>

        <h2 style="color: #001f3f; margin-top: 0; font-size: 20px;">Official Cadet Commission Order</h2>
        <p>Salute to Sainik <strong>${cadetName}</strong>, Jai Bhim!</p>
        <p>We are pleased to inform you that your application for enlistment in <strong>Samata Sainik Dal</strong> has been <strong>reviewed, verified, and officially approved</strong> by the Central Command Executive Directorate.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Cadet Full Name</td>
            <td style="padding: 10px; font-weight: bold; color: #001f3f;">${cadetName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Official Sainik ID</td>
            <td style="padding: 10px; color: #FF6B00; font-weight: bold; font-family: monospace; font-size: 15px;">${enlistId}</td>
          </tr>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Assigned Wing</td>
            <td style="padding: 10px; font-weight: bold; color: #001f3f;">${wing}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Assigned Command Area</td>
            <td style="padding: 10px; color: #1e293b;">${location}</td>
          </tr>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #64748b;">Approval Date</td>
            <td style="padding: 10px; color: #1e293b;">${dateStr}</td>
          </tr>
        </table>

        <div style="background: #eff6ff; border-left: 4px solid #001f3f; padding: 14px; margin-top: 18px; font-size: 13px; color: #1e3a8a;">
          <h4 style="margin: 0 0 6px; color: #1e3a8a;">Cadet Pledge:</h4>
          <em>"As a Sainik of Samata Sainik Dal, I swear to stand for the constitutional rights of all citizens, practice self-discipline and equality, and safeguard the ideals of Dr. Babasaheb Ambedkar."</em>
        </div>

        <h3 style="color: #001f3f; margin-top: 24px; font-size: 15px;">Next Instructions for Cadet:</h3>
        <ol style="font-size: 13.5px; color: #334155; line-height: 1.6; padding-left: 20px;">
          <li>Your local Unit Commander will connect with you regarding unit assembly, cadet uniform guidelines, and weekly training parades.</li>
          <li>View upcoming movements and central circulars at <a href="https://ssdind.vercel.app/news-events" style="color: #FF6B00; font-weight: bold;">SSD News & Events</a>.</li>
          <li>For any coordination queries, reply to this email or contact Central Command at <strong>samyak.ssd@gmail.com</strong>.</li>
        </ol>

        <p style="margin-top: 26px; font-size: 13px; color: #64748b; line-height: 1.5;">
          With revolutionary salutations & Jai Bhim,<br>
          <strong>National Executive Committee & Cadet Directorate</strong><br>
          Samata Sainik Dal Central Command, Nagpur<br>
          <a href="https://ssdind.vercel.app" style="color: #FF6B00;">https://ssdind.vercel.app</a>
        </p>
      </div>
    </div>
  `;
}

