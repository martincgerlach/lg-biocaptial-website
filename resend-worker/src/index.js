const RESEND_API_URL = "https://api.resend.com/emails";
const FALLBACK_RECIPIENT = "lene.gerlach@gmail.com";
const FALLBACK_FROM_EMAIL = "website@lgbiocapitalpartners.com";

const getAllowedOrigins = (env) => {
  const origins = env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || "https://lgbiocapitalpartners.com";

  return origins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const getCorsHeaders = (request, env) => {
  const requestOrigin = request.headers.get("Origin") || "";
  const allowedOrigins = getAllowedOrigins(env);
  const allowAllOrigins = allowedOrigins.includes("*");
  const responseOrigin = allowAllOrigins
    ? "*"
    : allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": responseOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
};

const isAllowedOrigin = (request, env) => {
  const requestOrigin = request.headers.get("Origin");

  if (!requestOrigin) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins(env);

  return allowedOrigins.includes("*") || allowedOrigins.includes(requestOrigin);
};

const jsonResponse = (payload, status, headers) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
    },
  });

const cleanText = (value, maxLength) =>
  String(value || "")
    .trim()
    .slice(0, maxLength);

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const sanitizeHeaderName = (value) =>
  cleanText(value, 120)
    .replace(/[\r\n<>"]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const buildFromEmail = ({ firstName, lastName, env }) => {
  const fromEmail = cleanText(env.RESEND_FROM_EMAIL, 254) || FALLBACK_FROM_EMAIL;
  const fullName = sanitizeHeaderName([firstName, lastName].filter(Boolean).join(" "));
  const displayName = fullName || "LG BioCapital Website";

  return `${displayName} <${fromEmail}>`;
};

const buildReplyToEmail = ({ firstName, lastName, email }) => {
  const fullName = sanitizeHeaderName([firstName, lastName].filter(Boolean).join(" "));

  return fullName ? `${fullName} <${email}>` : email;
};

const buildMessage = ({ firstName, lastName, email, message }) => {
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Not provided";

  return [
    `Name: ${fullName}`,
    `Email: ${email}`,
    "",
    "Message:",
    message,
  ].join("\n");
};

const buildHtmlMessage = ({ firstName, lastName, email, message }) => {
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Not provided";

  return `
    <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>
  `;
};

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405, corsHeaders);
    }

    if (!isAllowedOrigin(request, env)) {
      return jsonResponse({ error: "Origin not allowed." }, 403, corsHeaders);
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);

    if (contentLength > 10000) {
      return jsonResponse({ error: "Message is too large." }, 413, corsHeaders);
    }

    let payload;

    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid form payload." }, 400, corsHeaders);
    }

    if (payload.botcheck) {
      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    const firstName = cleanText(payload.name, 100);
    const lastName = cleanText(payload.last_name, 100);
    const email = cleanText(payload.email, 254).toLowerCase();
    const message = cleanText(payload.message, 4000);
    const subject = cleanText(payload.subject, 160) || "New message from LG BioCapital website";

    if (!firstName || !email || !message) {
      return jsonResponse({ error: "Name, email, and message are required." }, 400, corsHeaders);
    }

    if (!isValidEmail(email)) {
      return jsonResponse({ error: "Please enter a valid email address." }, 400, corsHeaders);
    }

    if (!env.RESEND_API_KEY) {
      return jsonResponse({ error: "Resend is not configured yet." }, 500, corsHeaders);
    }

    const replyTo = buildReplyToEmail({ firstName, lastName, email });

    const resendResponse = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        from: buildFromEmail({ firstName, lastName, env }),
        to: [env.CONTACT_TO_EMAIL || FALLBACK_RECIPIENT],
        reply_to: [replyTo],
        subject,
        headers: {
          "Reply-To": replyTo,
        },
        text: buildMessage({ firstName, lastName, email, message }),
        html: buildHtmlMessage({ firstName, lastName, email, message }),
      }),
    });

    const result = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error("Resend failed", {
        status: resendResponse.status,
        result,
      });

      return jsonResponse({ error: "Email could not be sent." }, 502, corsHeaders);
    }

    return jsonResponse({ success: true, id: result.id || null }, 200, corsHeaders);
  },
};
