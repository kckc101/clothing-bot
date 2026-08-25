# Clothing Shop Messenger Bot

A simple AI-powered chatbot that auto-replies to Facebook Page messages using Claude.

## What you need before deploying

1. **VERIFY_TOKEN** — any password you make up yourself (e.g. `kc-clothing-2026`)
2. **PAGE_ACCESS_TOKEN** — from Meta Developer dashboard (Messenger API Settings → Generate)
3. **ANTHROPIC_API_KEY** — from https://console.anthropic.com (Settings → API Keys → Create Key)

## Deploy to Render (free)

1. Go to https://render.com and sign up (free, no card needed for the free tier)
2. Click "New +" → "Web Service"
3. Connect your GitHub account and push this folder as a repo (or use "Public Git repository" if hosted elsewhere)
4. Render will detect it's a Node app automatically
5. Under "Environment", add these three variables:
   - `VERIFY_TOKEN` = (your made-up password)
   - `PAGE_ACCESS_TOKEN` = (from Meta)
   - `ANTHROPIC_API_KEY` = (from Anthropic console)
6. Click "Create Web Service" and wait for it to deploy
7. Once live, Render gives you a URL like `https://your-app-name.onrender.com`

## Connect back to Meta

1. Go back to Meta Developer Dashboard → Messenger API Settings
2. Find "1. Configure webhooks" (near the top, above where you generated the token)
3. Callback URL: `https://your-app-name.onrender.com/webhook`
4. Verify Token: the same VERIFY_TOKEN you set in Render
5. Click "Verify and Save"
6. Subscribe to the `messages` field

## Edit your business info

Open `server.js` and edit the `BUSINESS_CONTEXT` block near the top —
replace the placeholder shop name, sizes, delivery prices, and policies
with your real clothing shop details.

## Test it

Message your Facebook Page from a personal account (as admin, you can test
without App Review) and see if the bot replies naturally.
