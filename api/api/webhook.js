// api/webhook.js
import crypto from "crypto";

/**
 * Vercel Serverless Function
 * المتغير المطلوب:
 * - MOYASAR_WEBHOOK_SECRET = whsec_...
 *
 * ملاحظة: ميسر يرسل الهيدر x-moyasar-signature وفي البودي JSON.
 * ببعض المنصات نحتاج الـ raw body. في Vercel سنحاول أخذ النص الخام إن توفر،
 * وإلا نستخدم JSON.stringify(req.body) كحل بديل.
 */

function getRawBody(req) {
  return new Promise((resolve) => {
    try {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => resolve(data));
    } catch {
      resolve(null);
    }
  });
}

export default async function handler(req, res) {
  // CORS (لو أردت فتحه للكل)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-moyasar-signature");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const secret = process.env.MOYASAR_WEBHOOK_SECRET;
  if (!secret) return res.status(500).send("Missing webhook secret");

  try {
    const signature = req.headers["x-moyasar-signature"];
    if (!signature) return res.status(400).send("missing signature");

    // حاول جلب الـ raw body، وإن لم يتوفر استخدم stringify
    const raw = (await getRawBody(req)) || JSON.stringify(req.body || {});
    const digest = crypto.createHmac("sha256", secret).update(raw).digest("hex");

    if (digest !== signature) return res.status(401).send("invalid signature");

    const event = JSON.parse(raw);
    // أمثلة: invoice.paid / payment.paid / invoice.failed
    if (event.type === "invoice.paid" || event.type === "payment.paid") {
      const d = event.data;
      console.log("PAID ✅", d.id, d.amount, d.currency);
      // هنا ممكن تحفظ الطلب في Google Sheets/Firestore وترسل إيصال
    }

    return res.status(200).send("ok");
  } catch (e) {
    console.error(e);
    return res.status(400).send("bad request");
  }
}
