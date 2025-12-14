// Shared Brevo email sending utility

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: string;
  disableTracking?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
  const BREVO_SENDER_EMAIL = Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@familyportal.com';
  const BREVO_SENDER_NAME = Deno.env.get('BREVO_SENDER_NAME') || 'Family Portal';

  if (!BREVO_API_KEY) {
    console.error('BREVO_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    // Build request body
    const requestBody: Record<string, unknown> = {
      sender: {
        name: BREVO_SENDER_NAME,
        email: BREVO_SENDER_EMAIL,
      },
      to: [{ email: params.to }],
      subject: params.subject,
      htmlContent: params.htmlContent,
    };
    
    // Add plain text version if provided
    if (params.textContent) {
      requestBody.textContent = params.textContent;
    }
    
    // Add reply-to if provided
    if (params.replyTo) {
      requestBody.replyTo = { email: params.replyTo };
    }
    
    // Disable tracking if requested - use ALL available methods
    if (params.disableTracking !== false) {
      // Method 1: Custom headers
      requestBody.headers = {
        "X-Mailin-Track": "0",
        "X-Mailin-Track-Links": "0",
        "X-Mailin-Track-Opens": "0"
      };
      // Method 2: Tags with tracking disabled
      requestBody.tags = ["no-tracking"];
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Brevo API error:', result);
      return { success: false, error: result.message || 'Failed to send email' };
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email via Brevo:', error);
    return { success: false, error: error.message };
  }
}
