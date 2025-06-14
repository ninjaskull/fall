import * as brevo from '@getbrevo/brevo';

const BREVO_API_KEY = process.env.BREVO_API_KEY;

let apiInstance: brevo.TransactionalEmailsApi | null = null;

if (BREVO_API_KEY) {
  apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
}

interface ContactFormData {
  name: string;
  email: string;
  mobile: string;
}

export async function sendContactFormEmail(data: ContactFormData): Promise<boolean> {
  if (!apiInstance) {
    console.log('Email service not configured - BREVO_API_KEY not provided');
    return false;
  }

  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.subject = "New Contact Form Submission";
    sendSmtpEmail.to = [{ email: "new@fallowl.com", name: "Fallowl Team" }];
    sendSmtpEmail.sender = { name: "NeuralTech Solutions", email: "noreply@fallowl.com" };
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Contact Form Submission</h2>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Mobile:</strong> ${data.mobile}</p>
        </div>
        <p style="color: #666; font-size: 14px;">
          Submitted at: ${new Date().toLocaleString()}
        </p>
      </div>
    `;
    sendSmtpEmail.textContent = `
      New Contact Form Submission
      
      Name: ${data.name}
      Email: ${data.email}
      Mobile: ${data.mobile}
      
      Submitted at: ${new Date().toLocaleString()}
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Contact form email sent successfully via Brevo');
    return true;
  } catch (error: any) {
    if (error?.body?.message?.includes('unrecognised IP address')) {
      console.log('IP Authorization needed for Brevo. Please add IP to authorized list in Brevo dashboard.');
      console.log('Visit: https://app.brevo.com/security/authorised_ips');
    } else {
      console.error('Failed to send contact form email via Brevo:', error);
    }
    return false;
  }
}