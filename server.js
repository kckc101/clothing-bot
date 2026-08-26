// ============================================
// Clothing Shop Messenger Bot — Webhook Server
// Powered by Google Gemini (free tier)
// ============================================

const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();
app.use(bodyParser.json());

// ---------- CONFIG (set these as Environment Variables in Render) ----------
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ---------- YOUR BUSINESS INFO ----------
const BUSINESS_CONTEXT = `
You are a friendly, helpful assistant for "KC Navigator", a clothing
business in Cambodia. Answer customer questions on Facebook Messenger naturally,
in the same language the customer uses (Khmer or English).

BUSINESS INFO:
- Sizes available: S, M, L, XL (each product photo caption also lists exact
  measurements — ask the customer which item they mean if unclear)
- Delivery: flat $2 anywhere, usually 1-2 days
- Payment: KHQR, ABA, or Cash on Delivery
- Returns/exchanges: accepted within 3 days if item is unworn with tags attached
- Store hours: 8am - 8pm daily

RULES:
- Keep replies short and friendly, like a real shop owner texting back
- If you don't know something specific, say you'll check and get back to them
- Always ask a clarifying question if the request is ambiguous
`;

// ---------- Health check ----------
app.get("/", (req, res) => {
  res.send("Clothing shop bot is running!");
});

// ---------- Webhook verification (Meta calls this once) ----------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("Verification attempt:", { mode, token, challenge });

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK VERIFIED SUCCESSFULLY");
    res.status(200).send(challenge);
  } else {
    console.log("VERIFICATION FAILED — token mismatch or wrong mode");
    res.sendStatus(403);
  }
});

// ---------- Receiving messages ----------
app.post("/webhook", async (req, res) => {
  const body = req.body;
  console.log("Incoming webhook event:", JSON.stringify(body));

  if (body.object === "page") {
    for (const entry of body.entry) {
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message && event.message.text) {
        const userText = event.message.text;
        try {
          const reply = await askGemini(userText);
          await sendMessage(senderId, reply);
        } catch (err) {
          console.error("Error handling message:", err);
          await sendMessage(
            senderId,
            "Sorry, something went wrong — a real person will follow up shortly!"
          );
        }
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// ---------- Ask Gemini ----------
async function askGemini(userMessage) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: BUSINESS_CONTEXT }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 300 },
      }),
    }
  );

  const data = await response.json();

  if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }

  console.error("Unexpected Gemini response:", JSON.stringify(data));
  return "Sorry, I couldn't process that — a real person will follow up shortly!";
}

// ---------- Send message via Messenger ----------
async function sendMessage(recipientId, text) {
  await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: text },
      }),
    }
  );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
