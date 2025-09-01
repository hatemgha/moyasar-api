// api/create-invoice.js
import axios from "axios";

/**
 * بيئة التشغيل: Vercel Serverless Function
 * المتغيرات المطلوبة (ضيفها في إعدادات Vercel لاحقًا):
 * - MOYASAR_SECRET = sk_test_xxx أو sk_live_xxx
 * - RETURN_URL     = https://YOUR_BLOGGER_SITE/p/thank-you.html
 * - CURRENCY       = SAR (افتراضي SAR)
 * - CORS_ORIGIN    = https://YOUR_BLOGGER_SITE (للسماح بطلبات المتصفح)
 */

export default async function handler(req, res) {
  // السماح من أصل محدد (CORS)
  const ORIGIN = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { items, note, customer } = req.body || {};
    const total = Number((items || []).reduce((s, it) => s + Number(it.price) * Number(it.qty), 0).toFixed(2));

    if (!total || total <= 0) {
      return res.status(400).json({ error: "cart is empty" });
    }

    const payload = {
      amount: Math.round(total * 100), // إلى هللات
      currency: process.env.CURRENCY || "SAR",
      description: note || "طلب من متجر المدرب",
      callback_url: process.env.RETURN_URL,
      metadata: {
        customer_name: customer?.name || "",
        customer_phone: customer?.phone || "",
        cart: items
      }
      // يمكنك تقييد الوسائل لو رغبت:
      // sources: ["mada","creditcard","applepay"]
    };

    const r = await axios.post("https://api.moyasar.com/v1/invoices", payload, {
      auth: { username: process.env.MOYASAR_SECRET, password: "" }
    });

    return res.status(200).json({ url: r.data.url, id: r.data.id });
  } catch (e) {
    console.error(e?.response?.data || e.message);
    return res.status(500).json({ error: "failed to create invoice" });
  }
}
