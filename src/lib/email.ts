import { createClient } from "../../supabase/server";

export interface EmailTemplateOptions {
  title: string;
  preheader?: string;
  bodyContent: string;
  ctaButton?: {
    text: string;
    url: string;
  };
  footerText?: string;
  footerLink?: {
    text: string;
    url: string;
  };
}

export interface SendEmailParams {
  to: string;
  subject: string;
  template: EmailTemplateOptions;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using the shared email template styling.
 * All emails sent through this function will have consistent branding.
 */
export async function sendStyledEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.functions.invoke('supabase-functions-send-email', {
    body: {
      to: params.to,
      subject: params.subject,
      template: params.template,
      replyTo: params.replyTo,
    },
  });

  if (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }

  return { success: true, messageId: data?.messageId };
}

/**
 * Helper to create common email templates
 */
export const emailTemplates = {
  /**
   * Welcome email for new users
   */
  welcome: (params: { userName: string; agencyName: string; loginUrl: string }): EmailTemplateOptions => ({
    title: "Welcome!",
    preheader: `Welcome to ${params.agencyName}`,
    bodyContent: `
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hello ${params.userName},
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Welcome to <strong>${params.agencyName}</strong>! Your account has been successfully created.
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        You can now access the Family Communication Portal to stay connected with your care team.
      </p>
    `,
    ctaButton: {
      text: "Go to Portal",
      url: params.loginUrl,
    },
    footerText: "If you have any questions, please don't hesitate to reach out to your care team.",
  }),

  /**
   * Password reset email
   */
  passwordReset: (params: { resetUrl: string }): EmailTemplateOptions => ({
    title: "Reset Your Password",
    preheader: "Password reset request",
    bodyContent: `
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hello,
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        We received a request to reset your password. Click the button below to create a new password.
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    `,
    ctaButton: {
      text: "Reset Password",
      url: params.resetUrl,
    },
    footerText: "This link will expire in 1 hour for security reasons.",
    footerLink: {
      text: "If the button doesn't work, copy and paste this link into your browser:",
      url: params.resetUrl,
    },
  }),

  /**
   * Visit notification email
   */
  visitNotification: (params: {
    patientName: string;
    visitType: string;
    visitDate: string;
    visitTime: string;
    staffName: string;
    portalUrl: string;
  }): EmailTemplateOptions => ({
    title: "Visit Update",
    preheader: `${params.visitType} visit scheduled for ${params.patientName}`,
    bodyContent: `
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hello,
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        A <strong>${params.visitType}</strong> visit has been scheduled for <strong>${params.patientName}</strong>.
      </p>
      <div style="background-color: #FAF8F5; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
        <p style="color: #2D2D2D; font-size: 14px; line-height: 1.6; margin: 0;">
          <strong>Date:</strong> ${params.visitDate}<br>
          <strong>Time:</strong> ${params.visitTime}<br>
          <strong>Staff:</strong> ${params.staffName}
        </p>
      </div>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Log in to the portal for more details and to track the visit status.
      </p>
    `,
    ctaButton: {
      text: "View Visit Details",
      url: params.portalUrl,
    },
    footerText: "You're receiving this because you're a family member connected to this patient's care.",
  }),

  /**
   * Message notification email
   */
  messageNotification: (params: {
    senderName: string;
    messagePreview: string;
    portalUrl: string;
  }): EmailTemplateOptions => ({
    title: "New Message",
    preheader: `New message from ${params.senderName}`,
    bodyContent: `
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hello,
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        You have a new message from <strong>${params.senderName}</strong>:
      </p>
      <div style="background-color: #FAF8F5; border-radius: 8px; padding: 20px; margin: 0 0 24px; border-left: 4px solid #7A9B8E;">
        <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">
          "${params.messagePreview}"
        </p>
      </div>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Log in to the portal to read the full message and reply.
      </p>
    `,
    ctaButton: {
      text: "View Message",
      url: params.portalUrl,
    },
    footerText: "You're receiving this because you have message notifications enabled.",
  }),

  /**
   * Delivery notification email
   */
  deliveryNotification: (params: {
    patientName: string;
    itemDescription: string;
    status: string;
    trackingUrl?: string;
    portalUrl: string;
  }): EmailTemplateOptions => ({
    title: "Delivery Update",
    preheader: `Delivery update for ${params.patientName}`,
    bodyContent: `
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hello,
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        There's an update on a delivery for <strong>${params.patientName}</strong>.
      </p>
      <div style="background-color: #FAF8F5; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
        <p style="color: #2D2D2D; font-size: 14px; line-height: 1.6; margin: 0;">
          <strong>Item:</strong> ${params.itemDescription}<br>
          <strong>Status:</strong> ${params.status}
        </p>
      </div>
      ${params.trackingUrl ? `
        <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
          <a href="${params.trackingUrl}" style="color: #7A9B8E;">Track your delivery →</a>
        </p>
      ` : ''}
    `,
    ctaButton: {
      text: "View in Portal",
      url: params.portalUrl,
    },
    footerText: "You're receiving this because you're a family member connected to this patient's care.",
  }),

  /**
   * Supply request update email
   */
  supplyRequestUpdate: (params: {
    patientName: string;
    status: string;
    items: string[];
    portalUrl: string;
  }): EmailTemplateOptions => ({
    title: "Supply Request Update",
    preheader: `Supply request ${params.status.toLowerCase()} for ${params.patientName}`,
    bodyContent: `
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hello,
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Your supply request for <strong>${params.patientName}</strong> has been <strong>${params.status.toLowerCase()}</strong>.
      </p>
      <div style="background-color: #FAF8F5; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
        <p style="color: #2D2D2D; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
          <strong>Items:</strong>
        </p>
        <ul style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
          ${params.items.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `,
    ctaButton: {
      text: "View Request",
      url: params.portalUrl,
    },
    footerText: "You're receiving this because you submitted a supply request.",
  }),

  /**
   * Family member invitation email
   */
  familyInvitation: (params: {
    inviterName: string;
    patientName: string;
    relationship: string;
    inviteUrl: string;
  }): EmailTemplateOptions => ({
    title: "You're Invited!",
    preheader: `${params.inviterName} invited you to join the Family Portal`,
    bodyContent: `
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hello,
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        <strong>${params.inviterName}</strong> has invited you to join the Family Communication Portal as a <strong>${params.relationship}</strong> for <strong>${params.patientName}</strong>.
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        The portal allows you to stay connected with the care team, view visit schedules, send secure messages, and more.
      </p>
    `,
    ctaButton: {
      text: "Accept Invitation",
      url: params.inviteUrl,
    },
    footerText: "This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.",
    footerLink: {
      text: "If the button doesn't work, copy and paste this link into your browser:",
      url: params.inviteUrl,
    },
  }),

  /**
   * Feedback request email
   */
  feedbackRequest: (params: {
    patientName: string;
    visitType: string;
    visitDate: string;
    staffName: string;
    feedbackUrl: string;
  }): EmailTemplateOptions => ({
    title: "How Was Your Visit?",
    preheader: `Share your feedback about the recent ${params.visitType} visit`,
    bodyContent: `
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hello,
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        We hope the recent <strong>${params.visitType}</strong> visit for <strong>${params.patientName}</strong> went well.
      </p>
      <div style="background-color: #FAF8F5; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
        <p style="color: #2D2D2D; font-size: 14px; line-height: 1.6; margin: 0;">
          <strong>Date:</strong> ${params.visitDate}<br>
          <strong>Staff:</strong> ${params.staffName}
        </p>
      </div>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Your feedback helps us improve our care. Would you take a moment to share your experience?
      </p>
    `,
    ctaButton: {
      text: "Share Feedback",
      url: params.feedbackUrl,
    },
    footerText: "Your feedback is confidential and helps us provide better care.",
  }),

  /**
   * Bereavement support email
   */
  bereavementSupport: (params: {
    familyName: string;
    patientName: string;
    message: string;
    resourcesUrl?: string;
  }): EmailTemplateOptions => ({
    title: "We're Here For You",
    preheader: "Support during this difficult time",
    bodyContent: `
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Dear ${params.familyName},
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        ${params.message}
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Please know that our team is here to support you during this time. Don't hesitate to reach out if you need anything.
      </p>
    `,
    ctaButton: params.resourcesUrl ? {
      text: "View Support Resources",
      url: params.resourcesUrl,
    } : undefined,
    footerText: "With deepest sympathy, your care team.",
  }),

  /**
   * Generic notification email
   */
  notification: (params: {
    greeting?: string;
    message: string;
    ctaText?: string;
    ctaUrl?: string;
  }): EmailTemplateOptions => ({
    title: "Notification",
    bodyContent: `
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        ${params.greeting || 'Hello,'}
      </p>
      <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        ${params.message}
      </p>
    `,
    ctaButton: params.ctaText && params.ctaUrl ? {
      text: params.ctaText,
      url: params.ctaUrl,
    } : undefined,
  }),
};
