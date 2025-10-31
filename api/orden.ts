import type { VercelRequest, VercelResponse } from "@vercel/node";
import { google } from "googleapis";

async function sendMailIfConfigured(
  to: string,
  cc: string | undefined,
  subject: string,
  text: string,
  pdf?: { filename: string; content: Buffer }
) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !FROM_EMAIL) {
    return { sent: false, reason: "SMTP not configured" };
  }
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    cc,
    subject,
    text,
    attachments: pdf ? [{ filename: pdf.filename, content: pdf.content }] : [],
  });

  return { sent: true };
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const parts = dataUrl.split(",");
  const base64 = parts[1] || "";
  return Buffer.from(base64, "base64");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const {
      orderNumber, fecha, hora, branch,
      client, device, fail, stateIn, budget, tech,
      pdfDataUrl, fileName, test
    } = req.body || {};

    const {
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY,
      SHEET_ID,
      SHEET_NAME,
      COPY_TO,
    } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !SHEET_ID || !SHEET_NAME) {
      return res.status(500).json({ ok: false, error: "Faltan ENV de Google (service account o sheet)" });
    }

    // Auth con Service Account
    const jwt = new google.auth.JWT(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      undefined,
      (GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets"]
    );
    const sheets = google.sheets({ version: "v4", auth: jwt });

    // Guardar fila en Sheet
    const equipo = [device?.type, device?.brand, device?.model].filter(Boolean).join(" ");
    const values = [[
      new Date().toISOString(),
      orderNumber || "",
      fecha || "",
      hora || "",
      client?.name || "",
      client?.email || "",
      equipo,
      branch || "",
      tech || "",
      stateIn || "",
      fail || "",
      budget || "",
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:Z`,
      valueInputOption: "RAW",
      requestBody: { values },
    });

    // Email (opcional, si hay SMTP)
    let mailInfo: any = { skipped: true };
    if (!test && client?.email) {
      const pdfBuffer = pdfDataUrl ? dataUrlToBuffer(pdfDataUrl) : undefined;
      const text =
        `Hola ${client?.name || ""},\n\n` +
        `Adjuntamos la Orden de Trabajo como comprobante de ingreso.\n\n` +
        `Nos comunicaremos cuando hayan novedades.\n\n` +
        `Saludos,\n` +
        `Lucas Rongo – Técnico responsable\n` +
        `Lott Fix & Parts\n` +
        `Tel: 11-2602-1568 (WhatsApp)\n` +
        `www.lott.com.ar\n` +
        `lucasrongo@gmail.com`;

      mailInfo = await sendMailIfConfigured(
        client.email,
        COPY_TO,
        `Orden de Trabajo – ${orderNumber || ""}`,
        text,
        pdfBuffer && fileName ? { filename: fileName, content: pdfBuffer } : undefined
      );
    }

    return res.status(200).json({ ok: true, sheet: "ROW_APPENDED", mail: mailInfo });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
}
