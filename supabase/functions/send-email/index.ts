import { corsHeaders } from "@shared/cors.ts";
import { generateEmailHtml, EmailTemplateOptions } from "@shared/email-template.ts";
import { sendEmail } from "@shared/brevo.ts";

interface SendEmailRequest {
  to: string;
  subject: string;
  template?: EmailTemplateOptions;
  htmlContent?: string;
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
    const { to, subject, template, htmlContent, replyTo } = await req.json() as SendEmailRequest;

    if (!to || !subject || (!template && !htmlContent)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, and either template or htmlContent' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Use raw htmlContent if provided, otherwise generate from template
    const emailHtml = htmlContent || generateEmailHtml(template!);

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
