/**
 * ZYPH AI Server - Stealth Backend Proxy & Static Server
 * Zero dependencies - runs out of the box with: node server.js
 * Features: Multi-Key Rotation + Intelligent Auto-Switch Failover Engine
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables manually
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        env[key] = val;
      }
    }
  }
  return env;
}

const env = loadEnv();
const PORT = parseInt(env.PORT || process.env.PORT || '3001', 10);
const GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const DEFAULT_GEMINI_MODEL = env.AI_MODEL || 'gemini-3-flash-preview';

const GROQ_KEYS = [
  env.GROQ_API_KEY,
  env.GROQ_API_KEY_SECONDARY,
  env.GROQ_API_KEY_TERTIARY
].filter(Boolean);

const DEFAULT_GROQ_MODEL = env.GROQ_MODEL || 'openai/gpt-oss-120b';
const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

// Master prompt for single-file, 100% complete Unity 3D output
const MASTER_SYSTEM_PROMPT = `You are an expert, world-class Unity 3D game engine architect and principal C# programmer.
Answer the user's prompt directly, comprehensively, and in full depth just like ChatGPT or Gemini.

STRICT RULES - ABSOLUTELY NO PLACEHOLDERS:
1. NEVER output placeholders, dummy comments, pseudo-code, or omissions such as '// implement movement logic here', '// your code here', '// TODO', '// etc.'.
2. Every single class, method, variable, calculation, loop, and edge-case MUST be 100% fully written, functional, and production-ready.
3. If multiple scripts or files are needed (e.g. Player.cs, Collect.cs, GameManager.cs), provide ALL of them fully implemented.
4. Include all necessary using directives (using UnityEngine;, using System.Collections;, etc.).
5. Include step-by-step Unity Inspector setup (exact GameObject hierarchy, components to add, tags, layers, and field assignments).
6. Format the entire response into ONE single unified, clean, seamless text block so the user can copy and paste everything at once.`;

// HTTPS JSON Request Helper with explicit timeout
function postJson(urlStr, headers, bodyObj, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const bodyStr = JSON.stringify(bodyObj);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      timeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 160)}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${url.hostname} timed out after ${timeoutMs}ms`));
    });

    req.on('error', (err) => reject(err));
    req.write(bodyStr);
    req.end();
  });
}

// 1. Groq Completion with 3-Key Auto Rotation
async function callGroq(prompt, requestedModel) {
  const model = requestedModel || DEFAULT_GROQ_MODEL;
  let lastError = null;

  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const key = GROQ_KEYS[i];
    try {
      const res = await postJson('https://api.groq.com/openai/v1/chat/completions', {
        'Authorization': `Bearer ${key}`
      }, {
        model: model,
        messages: [
          { role: 'system', content: MASTER_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      }, 12000);

      const text = res.choices?.[0]?.message?.content;
      if (text && text.trim().length > 30) {
        return { text, model: `groq/${model} (Key #${i + 1})` };
      }
    } catch (err) {
      console.warn(`[Groq Key #${i + 1} Error]:`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error('All Groq keys exhausted');
}

// 2. Gemini Completion
async function callGemini(prompt, requestedModel) {
  const model = requestedModel || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  const res = await postJson(url, {}, {
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${MASTER_SYSTEM_PROMPT}\n\nUSER GAME ASSET SEARCH QUERY:\n${prompt}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192
    }
  }, 14000);

  const text = res.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || text.trim().length < 30) throw new Error('Gemini returned empty candidate');
  return { text, model: `gemini/${model}` };
}

// 3. OpenRouter Completion
async function callOpenRouter(prompt, requestedModel) {
  const model = requestedModel || 'meta-llama/llama-3.3-70b-instruct:free';
  const res = await postJson('https://openrouter.ai/api/v1/chat/completions', {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': 'https://freegameassets.com',
    'X-Title': 'Free Game Assets'
  }, {
    model: model,
    messages: [
      { role: 'system', content: MASTER_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2
  }, 14000);

  const text = res.choices?.[0]?.message?.content;
  if (!text || text.trim().length < 30) throw new Error('OpenRouter returned empty content');
  return { text, model: `openrouter/${model}` };
}

// --- INTELLIGENT AUTO-SWITCH FAILOVER ENGINE ---
async function executeAutoSwitchQuery(prompt, preferredProvider, preferredModel) {
  // Define available providers in priority sequence
  const tierCandidates = [
    { provider: 'groq', model: 'openai/gpt-oss-120b', fn: () => callGroq(prompt, 'openai/gpt-oss-120b') },
    { provider: 'gemini', model: 'gemini-3-flash-preview', fn: () => callGemini(prompt, 'gemini-3-flash-preview') },
    { provider: 'groq', model: 'qwen/qwen3.8-27b', fn: () => callGroq(prompt, 'qwen/qwen3.8-27b') },
    { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', fn: () => callOpenRouter(prompt, null) }
  ];

  // Re-order so preferred candidate is tested first
  if (preferredProvider) {
    const matchIdx = tierCandidates.findIndex(c => c.provider === preferredProvider && (!preferredModel || c.model === preferredModel));
    if (matchIdx > 0) {
      const [matched] = tierCandidates.splice(matchIdx, 1);
      tierCandidates.unshift(matched);
    }
  }

  let autoSwitched = false;
  let lastErr = null;

  for (let i = 0; i < tierCandidates.length; i++) {
    const candidate = tierCandidates[i];
    try {
      console.log(`[Engine Trying Tier #${i + 1}] ${candidate.provider} (${candidate.model})...`);
      const result = await candidate.fn();
      if (result && result.text) {
        if (i > 0) {
          autoSwitched = true;
          console.log(`[Auto-Switch Success] Switched to ${candidate.provider} (${candidate.model}) seamlessly!`);
        }
        return {
          ...result,
          autoSwitched,
          provider: candidate.provider,
          model: candidate.model
        };
      }
    } catch (err) {
      lastErr = err;
      console.warn(`[Tier #${i + 1} Failed] ${candidate.provider}: ${err.message}. Auto-switching to next tier...`);
    }
  }

  throw lastErr || new Error('All AI providers exhausted');
}

// MIME Types for Static Server
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// HTTP Server
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  // API Endpoint: /api/query
  if (req.method === 'POST' && pathname === '/api/query') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const query = payload.query;
        const provider = payload.provider || 'groq';
        const model = payload.model;

        if (!query || typeof query !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Query is required' }));
          return;
        }

        console.log(`[AI Query Request] "${query.slice(0, 60)}"`);
        const result = await executeAutoSwitchQuery(query, provider, model);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          result: result.text,
          modelUsed: result.model,
          provider: result.provider,
          autoSwitched: result.autoSwitched
        }));
      } catch (err) {
        console.error('[AI Query Failed]:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API Endpoint: /api/status
  if (req.method === 'GET' && pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      autoSwitchEnabled: true,
      groqKeysActive: GROQ_KEYS.length,
      geminiConfigured: !!GEMINI_API_KEY,
      openRouterConfigured: !!OPENROUTER_API_KEY
    }));
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(` ZYPH AI Asset Store Server running on http://localhost:${PORT}`);
  console.log(` Auto-Switch Mechanism: ACTIVE`);
  console.log(` Groq Keys Active: ${GROQ_KEYS.length} (Primary: ${DEFAULT_GROQ_MODEL})`);
  console.log(` Gemini Active: ${DEFAULT_GEMINI_MODEL}`);
  console.log(` OpenRouter Active: Ready`);
  console.log(`================================================================`);
});
