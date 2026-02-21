export const generateVerificationEmail = (code: string, nome: string = "Usuário") => `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
    
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f8f8f8; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f8f8;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f8f8; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #f0f0f0; box-shadow: 0 4px 24px rgba(0,0,0,0.02);">
          <tr>
            <td align="center" style="padding: 48px 40px 24px 40px;">
              <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; color: #000000; display: block;">
                InfluencerPRO
              </span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 32px 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 600; color: #000000; letter-spacing: -0.5px;">
                Olá, ${nome}! Verifica aqui o teu acesso
              </h1>
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Copie o código de segurança abaixo e cole na plataforma para concluir a sua autenticação.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 32px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 32px;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 300; letter-spacing: 16px; color: #000000; margin-left: 16px; display: block;">
                      ${code}
                    </span>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #a1a1aa;">
                Este código expira em 10 minutos.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #f4f4f5;">
                <tr><td style="height: 1px; line-height: 1px;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 32px 40px 48px 40px;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #71717a;">
                Se não pediu este código, pode ignorar e eliminar este e-mail em segurança. Outra pessoa pode ter digitado o seu endereço de e-mail por engano.
              </p>
            </td>
          </tr>
        </table>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <tr>
            <td align="center" style="padding: 32px 20px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #a1a1aa;">
                &copy; 2026 InfluencerPRO. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
