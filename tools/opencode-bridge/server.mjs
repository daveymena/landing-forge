#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  opencode-bridge — expone los modelos de OpenCode (incluidos los
 *  gratuitos de Zen) como una API OpenAI-compatible.
 *
 *      tu app  ──►  http://127.0.0.1:8787/v1/chat/completions
 *                        │
 *                        ▼  SDK HTTP de opencode
 *                   opencode serve (:4096)
 *                        │
 *                        ▼
 *                   opencode.ai/zen  (modelos free)
 *
 *  Por qué existe: el tier gratuito de Zen sólo acepta peticiones
 *  hechas "desde dentro de OpenCode" (si llamas a opencode.ai/zen/v1
 *  directamente responde 403 «free tier can only be used from within
 *  OpenCode»). Este puente habla con el servidor local de opencode,
 *  que sí tiene las credenciales y la firma correctas.
 *
 *  Cero dependencias. Node 20+.
 *
 *  Variables de entorno:
 *    PORT             8787                      puerto del puente
 *    HOST             127.0.0.1
 *    OPENCODE_URL     http://127.0.0.1:4096     servidor de opencode
 *    OPENCODE_BIN     opencode                  binario (si hay que arrancarlo)
 *    OPENCODE_AGENT   bridge                    agente usado (auto: bridge > plan > build)
 *    DEFAULT_MODEL    nemotron-3.5-lightning-free
 *    BRIDGE_API_KEY   (vacío)                   si se define, exige Bearer
 *    AUTOSTART        1                         arranca opencode serve si no responde
 * ------------------------------------------------------------------ */

import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const OPENCODE_URL = (process.env.OPENCODE_URL || "http://127.0.0.1:4096").replace(/\/+$/, "");
const OPENCODE_BIN = process.env.OPENCODE_BIN || "opencode";
let AGENT = process.env.OPENCODE_AGENT || "";
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "nemotron-3.5-lightning-free";
const API_KEY = process.env.BRIDGE_API_KEY || "";
const AUTOSTART = process.env.AUTOSTART !== "0";

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

/* --------------------------- opencode server --------------------------- */

async function ocFetch(path, init = {}, timeoutMs = 180_000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(`${OPENCODE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      signal: ctl.signal,
    });
    const txt = await r.text();
    if (!r.ok) throw new Error(`opencode ${r.status}: ${txt.slice(0, 300)}`);
    return txt ? JSON.parse(txt) : null;
  } finally {
    clearTimeout(t);
  }
}

async function alive() {
  try {
    await ocFetch("/config/providers", {}, 4000);
    return true;
  } catch {
    return false;
  }
}

let child = null;
async function ensureOpencode() {
  if (await alive()) return true;
  if (!AUTOSTART) return false;
  const port = new URL(OPENCODE_URL).port || "4096";
  log(`opencode no responde — arrancando «${OPENCODE_BIN} serve --port ${port}»`);
  child = spawn(OPENCODE_BIN, ["serve", "--port", port, "--hostname", "127.0.0.1"], {
    stdio: "ignore",
    detached: false,
    cwd: HERE, // aquí vive opencode.json con el agente "bridge" (prompt neutro)
  });
  child.on("error", (e) => log("no se pudo arrancar opencode:", e.message));
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await alive()) {
      log("opencode listo");
      return true;
    }
  }
  return false;
}

/* ------------------------------ agente ------------------------------ */

/** El agente por defecto de opencode se presenta como "asistente de código".
 *  Preferimos "bridge" (prompt neutro, definido en el opencode.json de al lado).
 *  Ojo: NO hay que desactivar las herramientas en la petición — el tier gratuito
 *  de Zen devuelve 403 si el payload no se parece al de opencode nativo. */
async function pickAgent() {
  if (AGENT) return AGENT;
  try {
    const rows = await ocFetch("/agent", {}, 6000);
    const names = (rows || []).map((a) => a.name);
    AGENT = ["bridge", "plan", "build"].find((n) => names.includes(n)) || "build";
  } catch {
    AGENT = "build";
  }
  return AGENT;
}

/* ------------------------------ modelos ------------------------------ */

let modelCache = { at: 0, rows: [] };

async function models() {
  if (Date.now() - modelCache.at < 60_000 && modelCache.rows.length) return modelCache.rows;
  const d = await ocFetch("/config/providers");
  const rows = [];
  for (const p of d.providers || []) {
    for (const [id, m] of Object.entries(p.models || {})) {
      rows.push({
        id: p.id === "opencode" ? id : `${p.id}/${id}`,
        providerID: p.id,
        modelID: id,
        name: m.name || id,
        free: /-free$/.test(id) || id === "big-pickle" || m.cost?.input === 0,
        context: m.limit?.context || 0,
      });
    }
  }
  modelCache = { at: Date.now(), rows };
  return rows;
}

async function resolveModel(requested) {
  const rows = await models();
  const want = String(requested || DEFAULT_MODEL).replace(/^opencode\//, "");
  const hit =
    rows.find((r) => r.id === want || r.modelID === want) ||
    rows.find((r) => r.modelID === DEFAULT_MODEL) ||
    rows.find((r) => r.free) ||
    rows[0];
  if (!hit) throw new Error("opencode no reporta ningún modelo disponible");
  return hit;
}

/* --------------------------- chat completions --------------------------- */

/** Aplana los mensajes OpenAI en {system, prompt} para la API de sesiones. */
function flatten(messages = []) {
  const sys = [];
  const turns = [];
  for (const m of messages) {
    const content =
      typeof m.content === "string"
        ? m.content
        : (m.content || []).map((c) => c.text || c.content || "").join("\n");
    if (!content) continue;
    if (m.role === "system") sys.push(content);
    else if (m.role === "assistant") turns.push(`Asistente:\n${content}`);
    else turns.push(`Usuario:\n${content}`);
  }
  // si sólo hay un turno de usuario no hace falta etiquetarlo
  const prompt = turns.length === 1 ? turns[0].replace(/^Usuario:\n/, "") : turns.join("\n\n");
  return { system: sys.join("\n\n"), prompt };
}

function textOf(msg) {
  return (msg?.parts || [])
    .filter((p) => p.type === "text")
    .map((p) => p.text || "")
    .join("")
    .trim();
}

async function chat({ model, messages, response_format, temperature }) {
  const m = await resolveModel(model);
  let { system, prompt } = flatten(messages);

  if (response_format?.type === "json_object" || response_format?.type === "json_schema") {
    system = `${system}\n\nResponde ÚNICAMENTE con JSON válido, sin markdown ni texto alrededor.`.trim();
  }

  const agent = await pickAgent();

  const session = await ocFetch("/session", {
    method: "POST",
    body: JSON.stringify({ title: "bridge" }),
  });

  try {
    const res = await ocFetch(`/session/${session.id}/message`, {
      method: "POST",
      body: JSON.stringify({
        model: { providerID: m.providerID, modelID: m.modelID },
        agent,
        ...(system ? { system } : {}),
        parts: [{ type: "text", text: prompt }],
      }),
    });

    const err = res?.info?.error;
    if (err) {
      const detail = err.data?.message || err.name || "error desconocido";
      throw new Error(detail);
    }
    const text = textOf(res);
    if (!text) throw new Error("el modelo devolvió una respuesta vacía");

    const tk = res.info?.tokens || {};
    return {
      text,
      model: m.id,
      usage: {
        prompt_tokens: tk.input || 0,
        completion_tokens: tk.output || 0,
        total_tokens: (tk.input || 0) + (tk.output || 0),
      },
    };
  } finally {
    ocFetch(`/session/${session.id}`, { method: "DELETE" }, 8000).catch(() => {});
  }
}

/* -------------------------------- HTTP -------------------------------- */

const json = (res, code, body) => {
  const s = JSON.stringify(body);
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Content-Length": Buffer.byteLength(s),
  });
  res.end(s);
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = "";
    req.on("data", (c) => {
      b += c;
      if (b.length > 8e6) reject(new Error("cuerpo demasiado grande"));
    });
    req.on("end", () => {
      try {
        resolve(b ? JSON.parse(b) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    return res.end();
  }

  if (path === "/health" || path === "/") {
    const up = await alive();
    return json(res, up ? 200 : 503, {
      ok: up,
      bridge: "opencode-bridge",
      opencode: OPENCODE_URL,
      agent: AGENT || "(auto)",
      defaultModel: DEFAULT_MODEL,
    });
  }

  if (API_KEY && path.startsWith("/v1")) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${API_KEY}`) return json(res, 401, { error: { message: "API key inválida" } });
  }

  try {
    if (path === "/v1/models" && req.method === "GET") {
      const rows = await models();
      return json(res, 200, {
        object: "list",
        data: rows.map((r) => ({
          id: r.id,
          object: "model",
          owned_by: r.providerID,
          created: 0,
          name: r.name,
          free: r.free,
          context_length: r.context,
        })),
      });
    }

    if (path === "/v1/chat/completions" && req.method === "POST") {
      const body = await readBody(req);
      const t0 = Date.now();
      const out = await chat(body);
      log(`${out.model} · ${Date.now() - t0}ms · ${out.usage.total_tokens} tok`);

      const payload = {
        id: `chatcmpl-${Math.random().toString(36).slice(2)}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: out.model,
        choices: [{ index: 0, message: { role: "assistant", content: out.text }, finish_reason: "stop" }],
        usage: out.usage,
      };

      if (body.stream) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        });
        const base = { id: payload.id, object: "chat.completion.chunk", created: payload.created, model: out.model };
        res.write(`data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: { role: "assistant" } }] })}\n\n`);
        res.write(
          `data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: { content: out.text } }] })}\n\n`,
        );
        res.write(
          `data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`,
        );
        res.write("data: [DONE]\n\n");
        return res.end();
      }
      return json(res, 200, payload);
    }

    return json(res, 404, { error: { message: `Ruta desconocida: ${path}` } });
  } catch (e) {
    log("error:", e.message);
    return json(res, 502, { error: { message: String(e.message || e), type: "bridge_error" } });
  }
});

const up = await ensureOpencode();
if (!up) {
  console.error(
    `\n⚠  No hay un servidor de opencode en ${OPENCODE_URL}.\n` +
      `   Arráncalo con:  opencode serve --port 4096\n` +
      `   (o instala opencode: npm i -g opencode-ai)\n`,
  );
}

server.listen(PORT, HOST, async () => {
  log(`opencode-bridge escuchando en http://${HOST}:${PORT}/v1`);
  if (up) {
    try {
      const rows = await models();
      const free = rows.filter((r) => r.free);
      log(`${rows.length} modelos (${free.length} gratuitos): ${free.slice(0, 6).map((r) => r.id).join(", ")}…`);
    } catch (e) {
      log("no pude listar modelos:", e.message);
    }
  }
});

process.on("SIGINT", () => {
  child?.kill();
  process.exit(0);
});
process.on("SIGTERM", () => {
  child?.kill();
  process.exit(0);
});
