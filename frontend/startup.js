const express = require("express");
const path = require("path");

const app = express();
const BACKEND_API = process.env.BACKEND_API || "https://mediacoreapi-sql.masakalirestrobar.ca";

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;
  let capturedJsonResponse;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (requestPath.startsWith("/api")) {
      let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

app.get("/api/og/:mediaId", async (req, res) => {
  try {
    const { mediaId } = req.params;
    const userAgent = req.headers["user-agent"] || "";

    log(`OG request for media ${mediaId}`);
    log(`UA: ${userAgent.substring(0, 100)}`);

    const backendUrl = `${BACKEND_API}/api/media/${mediaId}`;
    log(`Fetching backend: ${backendUrl}`);

    const backendResponse = await fetch(backendUrl, {
      headers: {
        "x-api-key": process.env.BACKEND_API_KEY || "test",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!backendResponse.ok) {
      log(`Backend returned ${backendResponse.status}`, "og-handler");
      return res.send(generateGenericOGHTML());
    }

    const mediaData = await backendResponse.json();
    if (!mediaData.success || !mediaData.data) {
      log("Invalid backend response format", "og-handler");
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

    log(`Serving OG for ${title}`);
    log(`Image: ${image}`);

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
  <meta property="og:image:type" content="image/jpeg" />
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
  <script>
    if (navigator.userAgent.toLowerCase().match(/(facebookexternalhit|whatsapp|twitterbot|telegrambot|linkedinbot|slackbot|pinterest|discordbot|skypeuripreview)/)) {
    } else {
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
    log(`Error generating OG tags: ${error.message}`, "og-handler");
    console.error(error);
    res.send(generateGenericOGHTML());
  }
});

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

const buildDir = path.join(__dirname, "build");
app.use(express.static(buildDir, { maxAge: "1d" }));

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({ error: "API route not found" });
  } else {
    res.sendFile(path.join(buildDir, "index.html"));
  }
});

app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(err);
});

const PORT = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, "0.0.0.0", () => {
  log(`Frontend server running on http://0.0.0.0:${PORT}`);
  log(`Backend API: ${BACKEND_API}`);
});
