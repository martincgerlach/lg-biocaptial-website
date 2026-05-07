# Resend Contact Form Worker

This Cloudflare Worker keeps the Resend API key server-side while the website stays on GitHub Pages.

## Setup

1. Create a Resend API key in the Resend dashboard.
2. Verify `lgbiocapitalpartners.com` in Resend so `website@lgbiocapitalpartners.com` can be used as the sender.
3. From this folder, log in to Cloudflare and deploy with Wrangler:

```bash
npx wrangler login
npx wrangler secret put RESEND_API_KEY
npx wrangler deploy
```

4. Copy the deployed Worker URL into `index.html`:

```html
data-form-endpoint="https://lg-biocapital-contact-form.martingerlach.workers.dev"
```

The live site currently uses the deployed Worker URL above.
