import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const BACKEND_API = process.env.BACKEND_API || "https://mediacoreapi-sql.masakalirestrobar.ca";

// Middleware to capture raw body
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

// Logging utility
function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});


// Generic OG fallback
function generateGenericOGHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="MediaCore - Premium Audio & Video Streaming" />
  <meta property="og:description" content="Discover and stream premium audio and video content" />
  <meta property="og:image" content="https://app.mediacore.in/logo512.png" />
  <meta property="og:type" content="website" />
  <title>MediaCore</title>
</head>
<body></body>
</html>`;
}

// HTML escape utility
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return (text || "").replace(/[&<>"']/g, (m) => map[m]);
}

// ============================================
// STATIC FILE SERVING (React SPA)
// ============================================
const buildDir = path.join(__dirname, "build");

// Serve static assets with caching
app.use(express.static(buildDir, { maxAge: "1d" }));

// SPA fallback - serve index.html for all non-API routes
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    // API route not found
    res.status(404).json({ error: "API route not found" });
  } else {
    // SPA - serve index.html
    res.sendFile(path.join(buildDir, "index.html"));
  }
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  console.error(err);
});

// ============================================
// START SERVER
// ============================================
(async () => {
  try {
    const port = parseInt(process.env.PORT || "3000", 10);

    httpServer.listen(
      {
        port,
        host: "0.0.0.0", // Allow all interfaces for cPanel
      },
      () => {
        log(`✅ Frontend server running on http://0.0.0.0:${port}`);
        log(`🔗 Backend API: ${BACKEND_API}`);
      }
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();

export default app;
