import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface ContactFormData {
  name: string;
  email: string;
  mobile: string;
}

export async function sendContactFormEmail(data: ContactFormData): Promise<boolean> {
  try {
    const emailContent = `
      New Contact Form Submission
      
      Name: ${data.name}
      Email: ${data.email}
      Mobile: ${data.mobile}
      
      Submitted at: ${new Date().toLocaleString()}
    `;

    await mailService.send({
      to: 'new@fallowl.com',
      from: 'noreply@fallowl.com', // This should be a verified sender email
      subject: 'New Contact Form Submission',
      text: emailContent,
      html: `
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
      `,
    });
    
    console.log('Contact form email sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send contact form email:', error);
    return false;
  }
}