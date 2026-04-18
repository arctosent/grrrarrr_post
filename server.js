const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { URL } = require("url");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8080);
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const STATE_FILE = path.join(DATA_DIR, "site_state.json");
const MAX_BODY_BYTES = 32 * 1024 * 1024;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

let apiQueue = Promise.resolve();

function defaultState() {
  return {
    posts: [],
    followers: [],
    revision: 0,
    updatedAt: new Date().toISOString()
  };
}

function normalizeString(value, maxLength) {
  const text = String(value == null ? "" : value).trim();
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function normalizeIsoDate(value) {
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

function createStatusId() {
  const prefix = String(Date.now());
  const random = String(Math.floor(Math.random() * 900000) + 100000);
  return (prefix + random).slice(0, 24);
}

function normalizeStatusId(value) {
  const digits = String(value == null ? "" : value).replace(/\D+/g, "");
  return digits.length >= 8 ? digits.slice(0, 24) : createStatusId();
}

function normalizeFollowers(value) {
  if (!Array.isArray(value)) return [];
  const unique = new Set();
  for (const item of value.slice(0, 50000)) {
    const username = normalizeString(item, 80).toLowerCase();
    if (!username) continue;
    unique.add(username);
  }
  return Array.from(unique).sort();
}

function normalizePosts(value) {
  if (!Array.isArray(value)) return [];
  const posts = [];
  const source = value.slice(0, 1200);

  for (let index = 0; index < source.length; index += 1) {
    const item = source[index];
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;

    const id = normalizeString(item.id || `post-${Date.now()}-${index}`, 120);
    const statusId = normalizeStatusId(item.statusId || item.status || id);

    const comments = [];
    const sourceComments = Array.isArray(item.comments) ? item.comments.slice(0, 500) : [];
    for (let cIndex = 0; cIndex < sourceComments.length; cIndex += 1) {
      const comment = sourceComments[cIndex];
      if (!comment || typeof comment !== "object" || Array.isArray(comment)) continue;
      comments.push({
        id: normalizeString(comment.id || `comment-${index}-${cIndex}`, 120),
        author: normalizeString(comment.author || "Visitante", 140),
        text: normalizeString(comment.text || "", 4000),
        avatar: normalizeString(comment.avatar || "", 220000),
        createdAt: normalizeIsoDate(comment.createdAt)
      });
    }

    posts.push({
      id,
      statusId,
      text: normalizeString(item.text || "", 12000),
      media: normalizeString(item.media || "", 2400000),
      favoriteCount: Math.max(0, Number(item.favoriteCount || 0) || 0),
      comments,
      createdAt: normalizeIsoDate(item.createdAt)
    });
  }

  posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return posts;
}

function normalizeState(rawState) {
  const source = rawState && typeof rawState === "object" && !Array.isArray(rawState) ? rawState : {};
  return {
    posts: normalizePosts(source.posts),
    followers: normalizeFollowers(source.followers),
    revision: Math.max(0, Number(source.revision || 0) || 0),
    updatedAt: normalizeIsoDate(source.updatedAt)
  };
}

async function ensureDataDir() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
}

async function readState() {
  await ensureDataDir();
  try {
    const raw = await fsp.readFile(STATE_FILE, "utf8");
    if (!raw.trim()) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === "ENOENT") return defaultState();
    return defaultState();
  }
}

async function writeState(state) {
  await ensureDataDir();
  const json = JSON.stringify(state);
  await fsp.writeFile(STATE_FILE, json, "utf8");
}

function sendJson(res, statusCode, payload) {
  if (res.writableEnded) return;
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache"
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(Object.assign(new Error("Payload too large"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          reject(Object.assign(new Error("Invalid JSON payload"), { statusCode: 400 }));
          return;
        }
        resolve(parsed);
      } catch (_error) {
        reject(Object.assign(new Error("Invalid JSON payload"), { statusCode: 400 }));
      }
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

async function handleApiRequest(req, res) {
  const method = String(req.method || "GET").toUpperCase();

  if (method === "OPTIONS") {
    res.writeHead(204, {
      Allow: "GET, POST, OPTIONS",
      "Cache-Control": "no-store"
    });
    res.end();
    return;
  }

  if (method !== "GET" && method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const state = await readState();

  if (method === "POST") {
    const payload = await readJsonBody(req, MAX_BODY_BYTES);
    if (Object.prototype.hasOwnProperty.call(payload, "posts")) {
      state.posts = normalizePosts(payload.posts);
    }
    if (Object.prototype.hasOwnProperty.call(payload, "followers")) {
      state.followers = normalizeFollowers(payload.followers);
    }
    state.revision = Math.max(0, Number(state.revision || 0) || 0) + 1;
    state.updatedAt = new Date().toISOString();
    await writeState(state);
  }

  sendJson(res, 200, state);
}

function sendFile(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.writableEnded) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Erro ao ler arquivo.");
    }
  });
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=300"
  });
  stream.pipe(res);
}

async function handleStaticRequest(req, res, pathname) {
  const method = String(req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method not allowed");
    return;
  }

  let requestPath = pathname === "/" ? "/index.html" : pathname;
  try {
    requestPath = decodeURIComponent(requestPath);
  } catch (_error) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Requisição inválida.");
    return;
  }

  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const resolved = path.resolve(ROOT_DIR, `.${safePath}`);
  if (!resolved.startsWith(ROOT_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Acesso negado.");
    return;
  }

  let targetPath = resolved;
  try {
    const stats = await fsp.stat(targetPath);
    if (stats.isDirectory()) {
      targetPath = path.join(targetPath, "index.html");
    }
  } catch (_error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Arquivo não encontrado.");
    return;
  }

  try {
    await fsp.access(targetPath, fs.constants.R_OK);
  } catch (_error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Arquivo não encontrado.");
    return;
  }

  if (method === "HEAD") {
    const extension = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[extension] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end();
    return;
  }

  sendFile(res, targetPath);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (pathname === "/api/posts" || pathname === "/api/posts.php") {
    apiQueue = apiQueue
      .then(() => handleApiRequest(req, res))
      .catch((error) => {
        const statusCode = error && Number.isInteger(error.statusCode) ? error.statusCode : 500;
        sendJson(res, statusCode, {
          error: statusCode === 500 ? "Server error" : error.message || "Request error"
        });
      });
    return;
  }

  handleStaticRequest(req, res, pathname).catch(() => {
    if (!res.writableEnded) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Erro interno.");
    }
  });
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    process.stdout.write(`Servidor JS ativo em http://${HOST}:${PORT}\n`);
  });
}

module.exports = {
  server,
  defaultState,
  normalizePosts,
  normalizeFollowers,
  normalizeState
};
