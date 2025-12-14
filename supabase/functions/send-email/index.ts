import { corsHeaders } from "@shared/cors.ts";
import { generateEmailHtml, EmailTemplateOptions } from "@shared/email-template.ts";
import { sendEmail } from "@shared/brevo.ts";

interface SendEmailRequest {
  to: string;
  subject: string;
  template: EmailTemplateOptions;
  replyTo?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const { to, subject, template, replyTo } = await req.json() as SendEmailRequest;

    if (!to || !subject || !template) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, template' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const emailHtml = generateEmailHtml(template);

    const result = await sendEmail({
      to,
      subject,
      htmlContent: emailHtml,
      replyTo,
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: result.error }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
