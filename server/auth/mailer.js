import nodemailer from 'nodemailer';

let cachedTransporterPromise = null;

/**
 * Inicializa el transporte de correo con Nodemailer:
 * 1. Si existe `SMTP_HOST` en variables de entorno, usa el servidor SMTP real configurado.
 * 2. Si no hay `SMTP_HOST` (entorno local/desarrollo), intenta crear una cuenta de prueba
 *    en Ethereal (`nodemailer.createTestAccount()`) con vista previa web real.
 * 3. Si no hay salida a internet o estamos en tests (`NODE_ENV === 'test'`), usa `jsonTransport: true`
 *    de Nodemailer para construir y despachar el mensaje MIME completo sin fallar por red.
 */
async function getTransporter() {
  if (cachedTransporterPromise) return cachedTransporterPromise;

  cachedTransporterPromise = (async () => {
    if (process.env.SMTP_HOST) {
      return {
        mode: 'smtp',
        transporter: nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
          auth:
            process.env.SMTP_USER && process.env.SMTP_PASS
              ? {
                  user: process.env.SMTP_USER,
                  pass: process.env.SMTP_PASS,
                }
              : undefined,
        }),
      };
    }

    if (process.env.NODE_ENV !== 'test' && process.env.AUTH_MAILER_OFFLINE !== '1') {
      try {
        const testAccount = await nodemailer.createTestAccount();
        return {
          mode: 'ethereal',
          transporter: nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          }),
        };
      } catch {
        // Fallback local si no hay conexión hacia smtp.ethereal.email
      }
    }

    return {
      mode: 'json-local',
      transporter: nodemailer.createTransport({ jsonTransport: true }),
    };
  })();

  return cachedTransporterPromise;
}

/**
 * Envía el correo de recuperación de contraseña con el token de un solo uso (expiración 15m).
 */
export async function sendPasswordResetEmail({
  to,
  name = 'Explorador',
  token,
  expiresInMinutes = 15,
  appOrigin = process.env.APP_ORIGIN || 'http://localhost:5173',
}) {
  const cleanOrigin = String(appOrigin).replace(/\/$/, '');
  const resetUrl = `${cleanOrigin}/?resetToken=${encodeURIComponent(token)}`;
  const fromAddress = process.env.SMTP_FROM || '"CodeKids Seguridad" <no-reply@codekids.edu.co>';

  const subject = 'Recuperación de contraseña - CodeKids (Expira en 15 minutos)';
  const text = [
    `Hola ${name},`,
    '',
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta en CodeKids.',
    `Este token es de UN SOLO USO y expira en ${expiresInMinutes} minutos:`,
    '',
    `Token: ${token}`,
    `Enlace directo: ${resetUrl}`,
    '',
    'Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura; tu contraseña no será modificada.',
  ].join('\n');

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="margin-top: 0; color: #111827;">Recuperación de contraseña en CodeKids</h2>
      <p style="color: #374151;">Hola <strong>${name}</strong>,</p>
      <p style="color: #374151;">
        Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente botón o copia el código de un solo uso (válido por <strong>${expiresInMinutes} minutos</strong>):
      </p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; display: inline-block;">
          Restablecer mi contraseña
        </a>
      </p>
      <p style="color: #4b5563; font-size: 13px;">
        Código de recuperación:<br />
        <code style="display: inline-block; margin-top: 4px; padding: 6px 10px; background: #f3f4f6; border-radius: 6px; font-size: 13px;">${token}</code>
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #6b7280; font-size: 12px; margin-bottom: 0;">
        Si tú no solicitaste este restablecimiento, ignora este correo. Tu cuenta sigue protegida.
      </p>
    </div>
  `;

  const { mode, transporter } = await getTransporter();
  const info = await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    text,
    html,
  });

  const previewUrl = mode === 'ethereal' ? nodemailer.getTestMessageUrl(info) || null : null;

  // En desarrollo local (no producción y no test silencioso), informar en consola dónde abrir el correo
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    console.log('\n================================================================');
    console.log(`[CodeKids Auth Mailer] Correo de recuperación enviado (${mode})`);
    console.log(`Destinatario : ${to}`);
    console.log(`Enlace Reset : ${resetUrl}`);
    if (previewUrl) {
      console.log(`Vista Previa : ${previewUrl}`);
    }
    console.log('================================================================\n');
  }

  return {
    sent: true,
    mode,
    messageId: info.messageId,
    previewUrl,
    resetUrl,
  };
}
