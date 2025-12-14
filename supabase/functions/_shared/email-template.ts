// Shared email template for consistent styling across all outgoing emails

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

export function generateEmailHtml(options: EmailTemplateOptions): string {
  const { title, preheader, bodyContent, ctaButton, footerText, footerLink } = options;

  const ctaButtonHtml = ctaButton ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${ctaButton.url}" style="display: inline-block; background-color: #7A9B8E; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        ${ctaButton.text}
      </a>
    </div>
  ` : '';

  const footerLinkHtml = footerLink ? `
    <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 16px 0 0;">
      ${footerLink.text}<br>
      <a href="${footerLink.url}" style="color: #7A9B8E; word-break: break-all;">${footerLink.url}</a>
    </p>
  ` : '';

  const footerTextHtml = footerText ? `
    <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #E5E5E5;">
      ${footerText}
    </p>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        ${preheader ? `<meta name="description" content="${preheader}">` : ''}
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
        </style>
        <![endif]-->
      </head>
      <body style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FAF8F5; margin: 0; padding: 40px 20px;">
        ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}
        <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #7A9B8E 0%, #5a7b6e 100%); padding: 40px 32px; text-align: center;">
            <h1 style="font-family: 'Fraunces', Georgia, serif; color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
              ${title}
            </h1>
          </div>
          <div style="padding: 40px 32px;">
            ${bodyContent}
            ${ctaButtonHtml}
            ${footerTextHtml}
            ${footerLinkHtml}
          </div>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0;">
            This email was sent by Family Communication Portal
          </p>
        </div>
      </body>
    </html>
  `;
}
