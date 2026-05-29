const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");
const fs = require("node:fs/promises");

const rootDir = __dirname;
const bundledContentPath = path.join(rootDir, "content.json");
const volumeContentPath = "/data/content.json";
let contentPath = bundledContentPath;
const port = Number(process.env.PORT || 4173);

async function initContentPath() {
  try {
    await fs.access("/data");
    contentPath = volumeContentPath;
    try {
      await fs.access(volumeContentPath);
    } catch {
      const bundled = await fs.readFile(bundledContentPath, "utf8");
      await fs.writeFile(volumeContentPath, bundled, "utf8");
      console.log("První spuštění: content.json zkopírován do /data");
    }
  } catch {
    contentPath = bundledContentPath;
  }
}
const adminUser = process.env.ADMIN_USER || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function isProtectedAdminPath(pathname, method) {
  return pathname === "/admin.html"
    || pathname === "/admin.css"
    || pathname === "/admin.js"
    || (pathname === "/api/content" && method !== "GET");
}

function isAuthorized(request) {
  if (!adminPassword) {
    return process.env.NODE_ENV !== "production";
  }

  const header = request.headers.authorization || "";

  if (!header.startsWith("Basic ")) {
    return false;
  }

  const [user, password] = Buffer
    .from(header.slice("Basic ".length), "base64")
    .toString("utf8")
    .split(":");

  return user === adminUser && password === adminPassword;
}

function requestAuth(response) {
  response.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="FILL ME IN admin"',
    "Content-Type": "text/plain; charset=utf-8"
  });
  response.end("Admin vyžaduje přihlášení.");
}

async function handleApi(request, response, pathname) {
  if (pathname !== "/api/content") {
    sendJson(response, 404, { error: "API endpoint nenalezen." });
    return;
  }

  if (request.method === "GET") {
    const content = await fs.readFile(contentPath, "utf8");
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    response.end(content);
    return;
  }

  if (request.method === "PUT" || request.method === "POST") {
    const nextContent = await readJsonBody(request);
    await fs.writeFile(contentPath, `${JSON.stringify(nextContent, null, 2)}\n`, "utf8");
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 405, { error: "Metoda není povolená." });
}

async function serveStatic(response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(rootDir, requestedPath));

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream"
    });
    response.end(data);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end(error.code === "ENOENT" ? "Soubor nenalezen." : "Chyba serveru.");
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);

    if (isProtectedAdminPath(pathname, request.method) && !isAuthorized(request)) {
      requestAuth(response);
      return;
    }

    if (pathname.startsWith("/api/")) {
      await handleApi(request, response, pathname);
      return;
    }

    await serveStatic(response, pathname);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Chyba serveru." });
  }
});

initContentPath().then(() => {
  server.listen(port, () => {
    console.log(`FILL ME IN server bezi na http://localhost:${port}`);
    console.log(`Admin editor: http://localhost:${port}/admin.html`);
    console.log(`Content path: ${contentPath}`);
  });
});
