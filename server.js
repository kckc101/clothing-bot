// ============================================
// Clothing Shop Messenger Bot — Webhook Server
// ============================================
// This server connects your Facebook Page to Claude AI.
// Flow: Customer messages Page -> Meta sends it here -> we ask Claude for
// a reply -> we send that reply back to the customer via Messenger.

const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();
app.use(bodyParser.json());

// ---------- CONFIG (fill these in as environment variables) ----------
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;         // a password YOU make up
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN; // from Meta dashboard
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY; // from console.anthropic.com

// ---------- YOUR BUSINESS INFO ----------
// Edit this block with real details about the clothing shop.
// This is what the AI uses to answer customer questions accurately.
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
- If you don't know something specific (like live stock of one exact item),
  say you'll check and get back to them, and mention someone will confirm shortly
- Always ask a clarifying question if the customer's request is ambiguous
  (e.g. which item, which size, their delivery location)
`;

// ---------- STEP 1: Webhook verification (Meta calls this once to confirm you're real) ----------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ---------- STEP 2: Receiving messages from customers ----------
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry) {
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message && event.message.text) {
        const userText = event.message.text;
        console.log("Received message:", userText);

        try {
          const reply = await askClaude(userText);
          await sendMessage(senderId, reply);
        } catch (err) {
          console.error("Error handling message:", err);
          await sendMessage(
            senderId,
            "Sorry, something went wrong on our end — a real person will follow up with you shortly!"
          );
        }
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// ---------- Helper: Ask Claude for a reply ----------
async function askClaude(userMessage) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: BUSINESS_CONTEXT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  const data = await response.json();

  if (data.content && data.content[0] && data.content[0].text) {
    return data.content[0].text;
  }

  console.error("Unexpected Claude response:", JSON.stringify(data));
  return "Sorry, I couldn't process that — a real person will follow up shortly!";
}

// ---------- Helper: Send message back through Messenger ----------
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

// ---------- Health check (so you can confirm the server is alive) ----------
app.get("/", (req, res) => {
  res.send("Clothing shop bot is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
