const https = require("https");

const API_KEY = process.env.ANTHROPIC_API_KEY;
const PORT    = process.env.PORT || 3000;

// Erlaubte Ursprünge (Netlify-Domain hier eintragen nach dem Deploy)
const ALLOWED_ORIGINS = [
  "https://animal-knights.netlify.app",  // <-- nach Netlify-Deploy anpassen
  "http://localhost",
  "http://127.0.0.1",
  "null"  // lokales Öffnen der HTML-Datei
];

require("http").createServer((req, res) => {
  const origin = req.headers.origin || "";

  // CORS
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader("Access-Control-Allow-Origin", "*"); // für einfachen Start; später einschränken
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method !== "POST" || req.url !== "/api/claude") {
    res.writeHead(404); res.end("Not found"); return;
  }

  let body = "";
  req.on("data", d => body += d);
  req.on("end", () => {
    let payload;
    try { payload = JSON.parse(body); } catch {
      res.writeHead(400); res.end("Bad JSON"); return;
    }

    const data = JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: payload.max_tokens || 1200,
      messages:   payload.messages
    });

    const options = {
      hostname: "api.anthropic.com",
      path:     "/v1/messages",
      method:   "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length":    Buffer.byteLength(data)
      }
    };

    const apiReq = https.request(options, apiRes => {
      let result = "";
      apiRes.on("data", d => result += d);
      apiRes.on("end", () => {
        res.writeHead(apiRes.statusCode, { "Content-Type": "application/json" });
        res.end(result);
      });
    });

    apiReq.on("error", e => {
      res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    });

    apiReq.write(data);
    apiReq.end();
  });
}).listen(PORT, () => console.log(`Animal Knights API-Proxy läuft auf Port ${PORT}`));
