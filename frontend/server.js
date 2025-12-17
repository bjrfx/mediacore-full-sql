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

// ============================================
// OG TAGS ENDPOINT (Frontend-side)
// ============================================
// Serves dynamic Open Graph tags for social media crawlers
// Fetches media from backend API and returns HTML with OG meta tags

app.get("/api/og/:mediaId", async (req, res) => {
  try {
    const { mediaId } = req.params;
    const userAgent = req.headers["user-agent"] || "";

    log(`🔍 OG Request for media: ${mediaId}`);
    log(`📱 UA: ${userAgent.substring(0, 100)}`);

    // Fetch media from backend API
    const backendUrl = `${BACKEND_API}/api/media/${mediaId}`;
    log(`📡 Fetching from backend: ${backendUrl}`);

    const backendResponse = await fetch(backendUrl, {
      headers: {
        "x-api-key": process.env.BACKEND_API_KEY || "test",
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!backendResponse.ok) {
      log(`❌ Backend returned ${backendResponse.status}`, "og-handler");
      return res.send(generateGenericOGHTML());
    }

    const mediaData = await backendResponse.json();

    // Validate response structure
    if (!mediaData.success || !mediaData.data) {
      log(`❌ Invalid backend response format`, "og-handler");
      return res.send(generateGenericOGHTML());
    }

    const media = mediaData.data;
    const isVideo = media.type === "video";
    const shareType = isVideo ? "watch" : "listen";
    const appDomain = process.env.APP_DOMAIN || "https://app.mediacore.in";

    const pageUrl = `${appDomain}/${shareType}/${media.id}`;
    const title = media.title || "MediaCore";
    const description =
      media.description ||
      `${isVideo ? "Watch" : "Listen to"} "${title}"${media.artist ? ` by ${media.artist}` : ""} on MediaCore`;

    // Construct absolute thumbnail URL
    let image = `${appDomain}/logo512.png`;
    if (media.thumbnail_path) {
      if (media.thumbnail_path.startsWith("http")) {
        image = media.thumbnail_path;
      } else if (media.thumbnail_path.startsWith("/")) {
        image = `${appDomain}${media.thumbnail_path}`;
      } else {
        image = `${appDomain}/${media.thumbnail_path}`;
      }
    }

    log(`✅ Serving OG for: "${title}"`);
    log(`   Image: ${image}`);

    // Generate HTML with OG tags
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow">

  <!-- Essential Open Graph Meta Tags -->
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="${isVideo ? "video.other" : "music.song"}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="og:site_name" content="MediaCore" />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${pageUrl}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(title)}" />

  <!-- Canonical URL -->
  <link rel="canonical" href="${pageUrl}" />

  <!-- Redirect to actual app for regular users -->
  <script>
    if (navigator.userAgent.toLowerCase().match(/(facebookexternalhit|whatsapp|twitterbot|telegrambot|linkedinbot|slackbot|pinterest|discordbot|skypeuripreview)/)) {
      // This is a crawler - serve the meta tags
    } else {
      // Regular user - redirect to app
      window.location.href = '${pageUrl}';
    }
  </script>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <p>Redirecting to MediaCore...</p>
</body>
</html>`;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(html);
  } catch (error) {
    log(`❌ Error generating OG tags: ${error.message}`, "og-handler");
    console.error(error);
    res.send(generateGenericOGHTML());
  }
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
