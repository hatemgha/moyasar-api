// api/create-invoice.js
import axios from "axios";

/**
 * Vercel Serverless Function
 * ملاحظات:
 * - تأكد أنك ضايف المتغيرات في Vercel > Settings > Environment Variables
 *   - MOYASAR_SECRET = sk_test_xxx أو sk_live_xxx
 *   - RETURN_URL    = https://YOUR_BLOGGER_SITE/p/thank-you.html
 *   - CORS_ORIGIN   = https://YOUR_BLOGGER_SITE
 */

export default async function handler(req, res) {
  // CORS
  const ORIGIN = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { items, note, customer } = req.body || {};
    const total = Number(
      (items || []).reduce(
        (sum, it) => sum + Number(it.price) * Number(it.qty),
        0
      ).toFixed(2)
    );

    if (!total || total <= 0) {
      return res.status(400).json({ error: "cart is empty" });
    }

    const response = await axios.post(
      "https://api.moyasar.com/v1/invoices",
      {
        amount: total * 100, // يحول للهللة
        currency: "SAR",
        description: note || "طلب جديد",
        callback_url: process.env.RETURN_URL,
        metadata: {
          customer_name: customer?.name,
          customer_phone: customer?.phone,
        },
      },
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(process.env.MOYASAR_SECRET + ":").toString("base64"),
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({ error: err.message });
  }
}
