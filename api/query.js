/**
 * Vercel Serverless Function: /api/query
 * Automatically deployed by Vercel for zero-config serverless AI execution
 */

const https = require('https');

// Environment variables configured in Vercel project settings
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_GEMINI_MODEL = process.env.AI_MODEL || 'gemini-3-flash-preview';

const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_SECONDARY,
  process.env.GROQ_API_KEY_TERTIARY
].filter(Boolean);

const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MASTER_SYSTEM_PROMPT = `You are an expert, world-class Unity 3D game engine architect and principal C# programmer.
Answer the user's prompt directly, comprehensively, and in full depth just like ChatGPT or Gemini.

STRICT RULES - ABSOLUTELY NO PLACEHOLDERS:
1. NEVER output placeholders, dummy comments, pseudo-code, or omissions such as '// implement movement logic here', '// your code here', '// TODO', '// etc.'.
2. Every single class, method, variable, calculation, loop, and edge-case MUST be 100% fully written, functional, and production-ready.
3. If multiple scripts or files are needed (e.g. Player.cs, Collect.cs, GameManager.cs), provide ALL of them fully implemented.
4. Include all necessary using directives (using UnityEngine;, using System.Collections;, etc.).
5. Include step-by-step Unity Inspector setup (exact GameObject hierarchy, components to add, tags, layers, and field assignments).
6. Format the entire response into ONE single unified, clean, seamless text block so the user can copy and paste everything at once.`;

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
      res.on('data', chunk => { data += chunk; });
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
      reject(new Error(`Timeout after ${timeoutMs}ms`));
    });

    req.on('error', err => reject(err));
    req.write(bodyStr);
    req.end();
  });
}

async function callGroq(prompt, requestedModel) {
  const model = requestedModel || DEFAULT_GROQ_MODEL;
  let lastErr = null;

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
      lastErr = err;
    }
  }
  throw lastErr || new Error('All Groq keys exhausted');
}

async function callGemini(prompt, requestedModel) {
  const model = requestedModel || DEFAULT_GEMINI_MODEL;
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
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

async function callOpenRouter(prompt, requestedModel) {
  const model = requestedModel || 'meta-llama/llama-3.3-70b-instruct:free';
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured');
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

async function executeAutoSwitchQuery(prompt, preferredProvider, preferredModel) {
  const tierCandidates = [];

  if (GROQ_KEYS.length > 0) {
    tierCandidates.push({ provider: 'groq', model: 'openai/gpt-oss-120b', fn: () => callGroq(prompt, 'openai/gpt-oss-120b') });
  }
  if (GEMINI_API_KEY) {
    tierCandidates.push({ provider: 'gemini', model: 'gemini-3-flash-preview', fn: () => callGemini(prompt, 'gemini-3-flash-preview') });
  }
  if (GROQ_KEYS.length > 0) {
    tierCandidates.push({ provider: 'groq', model: 'qwen/qwen3.8-27b', fn: () => callGroq(prompt, 'qwen/qwen3.8-27b') });
  }
  if (OPENROUTER_API_KEY) {
    tierCandidates.push({ provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', fn: () => callOpenRouter(prompt, null) });
  }

  if (preferredProvider && tierCandidates.length > 0) {
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
      const result = await candidate.fn();
      if (result && result.text) {
        if (i > 0) autoSwitched = true;
        return {
          ...result,
          autoSwitched,
          provider: candidate.provider,
          model: candidate.model
        };
      }
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error('All AI providers exhausted');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { query, provider = 'groq', model } = req.body || {};
    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, error: 'Query is required' });
      return;
    }

    const result = await executeAutoSwitchQuery(query, provider, model);
    res.status(200).json({
      success: true,
      result: result.text,
      modelUsed: result.model,
      provider: result.provider,
      autoSwitched: result.autoSwitched
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
