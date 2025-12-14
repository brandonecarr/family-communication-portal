import { corsHeaders } from "@shared/cors.ts";
import { generateEmailHtml } from "@shared/email-template.ts";
import { sendEmail } from "@shared/brevo.ts";

interface InvitationEmailRequest {
  email: string;
  token: string;
  inviterName: string;
  agencyName: string;
  role: string;
  baseUrl: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const { email, token, inviterName, agencyName, role, baseUrl } = await req.json() as InvitationEmailRequest;

    const inviteUrl = `${baseUrl}/accept-invite?token=${token}&email=${encodeURIComponent(email)}`;
    const roleLabel = role === 'agency_admin' ? 'Administrator' : 'Staff Member';

    const bodyContent = `
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hello,
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        <strong>${inviterName}</strong> has invited you to join <strong>${agencyName}</strong> as a <strong>${roleLabel}</strong> on our Family Communication Portal.
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Click the button below to accept your invitation and set up your account:
      </p>
    `;

    const emailHtml = generateEmailHtml({
      title: "You're Invited!",
      preheader: `${inviterName} has invited you to join ${agencyName}`,
      bodyContent,
      ctaButton: {
        text: "Accept Invitation",
        url: inviteUrl,
      },
      footerText: "This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.",
      footerLink: {
        text: "If the button doesn't work, copy and paste this link into your browser:",
        url: inviteUrl,
      },
    });

    const result = await sendEmail({
      to: email,
      subject: `${inviterName} invited you to join ${agencyName}`,
      htmlContent: emailHtml,
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
    console.error('Error sending invitation email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
