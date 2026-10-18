export function getPasswordResetTemplate(input: {
  appName: string;
  code: string;
  expiresInMinutes: number;
}) {
  const { appName, code, expiresInMinutes } = input;
  return {
    subject: `${code} is your ${appName} password reset code`,
    text: `Your ${appName} password reset code is: ${code}\n\nThe code expires in ${expiresInMinutes} minutes and can be used once. If you did not request it, ignore this email.`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#182033;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 12px;">Reset your password</h2>
        <p>Use this code to reset your ${appName} password:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:20px 0;">${code}</p>
        <p style="color:#667085;">It expires in ${expiresInMinutes} minutes and can be used once. If you did not request it, you can ignore this email.</p>
      </div>`,
  };
}
