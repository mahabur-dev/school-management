type SchoolAdminInvitationTemplateInput = {
  appName: string;
  schoolName: string;
  administratorName: string;
  administratorEmail: string;
  password: string;
  loginUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character];
  });
}

/** Branded first-access email sent after a platform admin creates a school. */
export function getSchoolAdminInvitationTemplate(
  input: SchoolAdminInvitationTemplateInput,
) {
  const appName = escapeHtml(input.appName);
  const schoolName = escapeHtml(input.schoolName);
  const administratorName = escapeHtml(input.administratorName);
  const administratorEmail = escapeHtml(input.administratorEmail);
  const password = escapeHtml(input.password);
  const loginUrl = escapeHtml(input.loginUrl);

  return {
    subject: `Your ${schoolName} workspace is ready | ${input.appName}`,
    text: `Welcome to ${input.appName}, ${input.administratorName}.\n\n${input.schoolName} is ready. You have been set up as its first school administrator.\n\nYour sign-in details:\nEmail: ${input.administratorEmail}\nPassword: ${input.password}\nSign in: ${input.loginUrl}\n\nFor security, keep these credentials private and change your password after your first sign-in.`,
    html: `
      <div style="margin:0;padding:32px 16px;background:#eef4fd;font-family:Arial,Helvetica,sans-serif;color:#17253d;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #dce5f0;border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(24,54,98,.10);">
          <tr><td style="padding:26px 30px;background:linear-gradient(135deg,#0b78fa,#075dce);color:#ffffff;">
            <div style="display:inline-block;padding:7px 10px;border:1px solid rgba(255,255,255,.28);border-radius:99px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">School workspace</div>
            <h1 style="margin:18px 0 6px;font-size:28px;line-height:1.2;letter-spacing:-.5px;color:#ffffff;">Welcome to ${schoolName}</h1>
            <p style="margin:0;color:rgba(255,255,255,.84);font-size:14px;line-height:1.55;">Your secure school operations workspace is ready.</p>
          </td></tr>
          <tr><td style="padding:30px;">
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hello ${administratorName},</p>
            <p style="margin:0 0 22px;color:#53657c;font-size:14px;line-height:1.65;">You have been assigned as the first administrator for <strong style="color:#24364e;">${schoolName}</strong>. Use the credentials below to securely access your dashboard.</p>
            <div style="padding:18px;border:1px solid #d9e5f3;border-radius:13px;background:#f7faff;">
              <p style="margin:0 0 12px;color:#0b68da;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;">Your sign-in details</p>
              <p style="margin:0 0 8px;color:#718198;font-size:12px;">Email address</p><p style="margin:0 0 16px;color:#17253d;font-size:14px;font-weight:700;">${administratorEmail}</p>
              <p style="margin:0 0 8px;color:#718198;font-size:12px;">Password</p><p style="margin:0;color:#17253d;font-size:14px;font-weight:700;word-break:break-all;">${password}</p>
            </div>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;"><tr><td style="border-radius:10px;background:#0b73f6;"><a href="${loginUrl}" style="display:inline-block;padding:14px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">Login to your dashboard &rarr;</a></td></tr></table>
            <p style="margin:0;color:#66778d;font-size:12px;line-height:1.6;">For your security, keep these credentials private and change your password after your first sign-in. If you were not expecting this invitation, contact your platform administrator.</p>
          </td></tr>
          <tr><td style="padding:16px 30px;border-top:1px solid #e7edf4;color:#7b899b;font-size:11px;">${appName} &middot; Secure, tenant-protected school operations</td></tr>
        </table>
      </div>`,
  };
}
