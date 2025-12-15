import { corsHeaders } from "@shared/cors.ts";
import { generateEmailHtml } from "@shared/email-template.ts";
import { sendEmail } from "@shared/brevo.ts";

interface FamilyInvitationEmailRequest {
  email: string;
  token: string;
  familyMemberName: string;
  patientName: string;
  agencyName: string;
  relationship: string;
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
    const { email, token, familyMemberName, patientName, agencyName, relationship, baseUrl } = await req.json() as FamilyInvitationEmailRequest;

    const inviteUrl = `${baseUrl}/accept-invite?token=${token}&email=${encodeURIComponent(email)}&type=family`;

    const bodyContent = `
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hello ${familyMemberName},
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        You have been invited to join the <strong>${agencyName}</strong> Family Communication Portal as a <strong>${relationship}</strong> for <strong>${patientName}</strong>.
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        This portal allows you to:
      </p>
      <ul style="color: #2D2D2D; font-size: 16px; line-height: 1.8; margin: 0 0 24px; padding-left: 24px;">
        <li>View upcoming visits and schedules</li>
        <li>Send secure messages to the care team</li>
        <li>Track medication deliveries</li>
        <li>Request supplies</li>
        <li>Access educational resources</li>
      </ul>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Click the button below to accept your invitation and set up your account:
      </p>
    `;

    const emailHtml = generateEmailHtml({
      title: "You're Invited to the Family Portal",
      preheader: `Join ${agencyName}'s Family Communication Portal`,
      bodyContent,
      ctaButton: {
        text: "Accept Invitation",
        url: inviteUrl,
      },
      footerText: "This invitation will expire in 7 days. If you didn't expect this invitation, please contact the hospice agency directly.",
      footerLink: {
        text: "If the button doesn't work, copy and paste this link into your browser:",
        url: inviteUrl,
      },
    });

    const result = await sendEmail({
      to: email,
      subject: `You're invited to ${agencyName}'s Family Portal`,
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
    console.error('Error sending family invitation email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
