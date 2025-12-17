const express = require("express");
const path = require("path");

const app = express();
const BACKEND_API = process.env.BACKEND_API || "https://mediacoreapi-sql.masakalirestrobar.ca";
const APP_DOMAIN = process.env.APP_DOMAIN || "https://app.mediacore.in";
const API_KEY = process.env.BACKEND_API_KEY || process.env.REACT_APP_PUBLIC_API_KEY || "mc_3f177f8a673446ba8ee152728d877b00";
const PORT = parseInt(process.env.PORT || "3000", 10);

function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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

function genericOGHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="MediaCore - Premium Audio & Video Streaming" />
  <meta property="og:description" content="Discover and stream premium audio and video content" />
  <meta property="og:image" content="${APP_DOMAIN}/logo512.png" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${APP_DOMAIN}" />
  <meta name="twitter:card" content="summary_large_image" />
  <title>MediaCore</title>
  <meta http-equiv="refresh" content="0;url=${APP_DOMAIN}">
</head>
<body></body>
</html>`;
}

// --------------------------------------------------
// OG route MUST be before static middleware
// --------------------------------------------------
app.get("/share/:mediaId", async (req, res) => {
  const { mediaId } = req.params;

  try {
    const backendUrl = `${BACKEND_API}/api/media/${mediaId}`;
    log(`OG fetch: ${backendUrl}`, "og");

    const headers = API_KEY ? { "x-api-key": API_KEY } : {};

    const backendResponse = await fetch(backendUrl, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (!backendResponse.ok) {
      log(`Backend responded ${backendResponse.status}`, "og");
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(genericOGHtml());
    }

    const mediaData = await backendResponse.json();
    if (!mediaData.success || !mediaData.data) {
      log("Backend payload invalid", "og");
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(genericOGHtml());
    }

    const media = mediaData.data;
    const isVideo = media.type === "video";
    const shareType = isVideo ? "watch" : "listen";
    const pageUrl = `${APP_DOMAIN}/${shareType}/${media.id}`;
    const title = media.title || "MediaCore";
    const description =
      media.description ||
      `${isVideo ? "Watch" : "Listen to"} "${title}"${media.artist ? ` by ${media.artist}` : ""} on MediaCore`;

    // Prefer backend-provided thumbnail fields; fall back to logo
    const thumb = media.thumbnailUrl || media.thumbnail || media.thumbnail_path;
    let image = `${APP_DOMAIN}/logo512.png`;

    if (thumb) {
      if (thumb.startsWith("http")) {
        image = thumb;
      } else if (thumb.startsWith("/")) {
        image = `${APP_DOMAIN}${thumb}`;
      } else {
        image = `${APP_DOMAIN}/${thumb}`;
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow">
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="${isVideo ? "video.other" : "music.song"}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta property="og:image:type" content="image/*" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="og:site_name" content="MediaCore" />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${pageUrl}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(title)}" />
  <link rel="canonical" href="${pageUrl}" />
  <meta http-equiv="refresh" content="0;url=${pageUrl}">
</head>
<body></body>
</html>`;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Vary", "User-Agent");
    res.status(200).send(html);
  } catch (error) {
    log(`OG error: ${error.message}`, "og");
    res.set("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(genericOGHtml());
  }
});

// --------------------------------------------------
// Static assets and SPA fallback
// --------------------------------------------------
const buildDir = path.join(__dirname, "build");
app.use(express.static(buildDir, { maxAge: "1d" }));

app.get("*", (_req, res) => {
  res.sendFile(path.join(buildDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  log(`Frontend server running on http://0.0.0.0:${PORT}`);
  log(`Backend API: ${BACKEND_API}`);
});
