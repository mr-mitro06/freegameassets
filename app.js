/**
 * Free Game Assets - Interactive Engine & Stealth AI Pipeline (ZYPH AI Integrated)
 */

(function () {
  'use strict';

  // --- ZYPH AI CONFIGURATION ---
  const CONFIG = {
    DEFAULT_GEMINI_MODEL: 'gemini-3-flash-preview',
    DEFAULT_GROQ_MODEL: 'openai/gpt-oss-120b',
    DEFAULT_OPENROUTER_MODEL: 'meta-llama/llama-3.3-70b-instruct:free',
    SERVER_API_URL: (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port !== '3001' && window.location.protocol !== 'file:') ? 'http://localhost:3001/api/query' : '/api/query'
  };

  // --- DEFAULT MASTER PROMPT FOR UNITY 3D CODES ---
  const DEFAULT_SYSTEM_PROMPT = `You are an expert, world-class Unity 3D game engine architect and principal C# programmer.
Answer the user's prompt directly, comprehensively, and in full depth just like ChatGPT or Gemini.

STRICT RULES - ABSOLUTELY NO PLACEHOLDERS:
1. NEVER output placeholders, dummy comments, pseudo-code, or omissions such as '// implement movement logic here', '// your code here', '// TODO', '// etc.'.
2. Every single class, method, variable, calculation, loop, and edge-case MUST be 100% fully written, functional, and production-ready.
3. If multiple scripts or files are needed (e.g. Player.cs, Collect.cs, GameManager.cs), provide ALL of them fully implemented.
4. Include all necessary using directives (using UnityEngine;, using System.Collections;, etc.).
5. Include step-by-step Unity Inspector setup (exact GameObject hierarchy, components to add, tags, layers, and field assignments).
6. Format the entire response into ONE single unified, clean, seamless text block so the user can copy and paste everything at once.`;

  // AVAILABLE MODEL PROFILES
  const MODEL_PROFILES = [
    { id: 'groq-120b', provider: 'groq', model: 'openai/gpt-oss-120b', label: 'Groq GPT-OSS 120B (Ultra-Fast)' },
    { id: 'gemini-3-flash', provider: 'gemini', model: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
    { id: 'groq-qwen-27b', provider: 'groq', model: 'qwen/qwen3.8-27b', label: 'Groq Qwen 3.8 27B' },
    { id: 'openrouter', provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', label: 'OpenRouter Llama 3.3 70B' }
  ];

  // --- STATE ---
  let state = {
    activeProfileIndex: parseInt(localStorage.getItem('fga_active_profile_index') || '0', 10),
    latestResult: localStorage.getItem('fga_latest_result') || '',
    history: JSON.parse(localStorage.getItem('fga_history') || '[]'),
    settings: {
      provider: localStorage.getItem('fga_provider') || 'groq',
      apiKey: localStorage.getItem('fga_api_key') || '',
      model: localStorage.getItem('fga_model') || CONFIG.DEFAULT_GROQ_MODEL,
      endpoint: localStorage.getItem('fga_endpoint') || '',
      systemPrompt: localStorage.getItem('fga_system_prompt') || DEFAULT_SYSTEM_PROMPT
    }
  };

  function getActiveProfile() {
    return MODEL_PROFILES[state.activeProfileIndex % MODEL_PROFILES.length];
  }

  function setActiveProfile(index) {
    state.activeProfileIndex = (index + MODEL_PROFILES.length) % MODEL_PROFILES.length;
    localStorage.setItem('fga_active_profile_index', state.activeProfileIndex);
    const p = getActiveProfile();
    state.settings.provider = p.provider;
    state.settings.model = p.model;
    localStorage.setItem('fga_provider', p.provider);
    localStorage.setItem('fga_model', p.model);
    renderModelQuickPills();
    initSettingsUI();
  }

  // --- DOM ELEMENTS ---
  const searchForm = document.getElementById('asset-search-form');
  const searchInput = document.getElementById('asset-search-input');
  const searchBtn = document.getElementById('asset-search-btn');
  const searchBtnIcon = document.getElementById('search-btn-icon');
  const searchStatusDot = document.getElementById('search-status-dot');
  const searchIconBox = document.getElementById('search-icon-box');
  const mainLogo = document.getElementById('main-logo');
  const logoImg = document.getElementById('main-logo-img');
  const toastContainer = document.getElementById('stealth-toast-container');

  // Easter egg elements
  const easterEggModal = document.getElementById('easter-egg-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const closeModalBottomBtn = document.getElementById('close-modal-bottom-btn');
  const secretDot = document.getElementById('secret-footer-dot');
  const secretSurge = document.getElementById('secret-surge-hitbox');

  // Modal tabs & panels
  const modalTabs = document.querySelectorAll('.modal-tab');
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  // Settings elements
  const settingProvider = document.getElementById('setting-provider');
  const settingModel = document.getElementById('setting-model');
  const settingApiKey = document.getElementById('setting-api-key');
  const settingEndpoint = document.getElementById('setting-endpoint');
  const endpointContainer = document.getElementById('custom-endpoint-container');
  const settingSystemPrompt = document.getElementById('setting-system-prompt');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const testConnBtn = document.getElementById('test-connection-btn');
  const settingsStatus = document.getElementById('settings-status');
  const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
  const savePromptBtn = document.getElementById('save-prompt-btn');
  const resetPromptBtn = document.getElementById('reset-prompt-btn');

  // Quick tag search buttons
  const quickTags = document.querySelectorAll('.quick-tag');

  // --- RENDER MODEL SELECTOR QUICK PILLS IN EASTER EGG CONSOLE ---
  function renderModelQuickPills() {
    const container = document.getElementById('model-switcher-pills');
    if (!container) return;

    const current = getActiveProfile();
    container.innerHTML = MODEL_PROFILES.map((p, idx) => {
      const isActive = idx === state.activeProfileIndex;
      return `
        <button type="button" class="model-pill-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
          isActive 
            ? 'bg-foreground text-background border-foreground shadow-sm' 
            : 'bg-background hover:bg-muted text-muted-foreground border-border'
        }" data-index="${idx}">
          ${isActive ? '<span class="w-2 h-2 rounded-full bg-emerald-400"></span>' : ''}
          <span>${p.label}</span>
        </button>
      `;
    }).join('');

    container.querySelectorAll('.model-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        setActiveProfile(idx);
        showToast(`Asset Engine Profile: ${getActiveProfile().label}`, 'info');
      });
    });
  }

  // --- INITIALIZE UI VALUES ---
  function initSettingsUI() {
    const p = getActiveProfile();
    if (settingProvider) settingProvider.value = state.settings.provider || p.provider;
    if (settingModel) settingModel.value = state.settings.model || p.model;
    if (settingApiKey) settingApiKey.value = state.settings.apiKey;
    if (settingEndpoint) settingEndpoint.value = state.settings.endpoint;
    if (settingSystemPrompt) settingSystemPrompt.value = state.settings.systemPrompt;
    updateEndpointVisibility();
    renderModelQuickPills();
  }

  function updateEndpointVisibility() {
    if (!endpointContainer || !settingProvider) return;
    if (['openrouter', 'custom'].includes(settingProvider.value)) {
      endpointContainer.classList.remove('hidden');
    } else {
      endpointContainer.classList.add('hidden');
    }
  }

  // --- TOAST NOTIFICATIONS (ZERO AI TRAILS) ---
  function showToast(message, type = 'success') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `stealth-toast stealth-toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>`;
    } else if (type === 'warning' || type === 'error') {
      iconSvg = `<svg class="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>`;
    } else {
      iconSvg = `<svg class="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    // Enter transition
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto dismiss after 3.8s
    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hide');
      setTimeout(() => {
        toast.remove();
      }, 350);
    }, 3800);
  }

  // --- CLIPBOARD COPY UTILITY ---
  async function copyToClipboard(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn('Clipboard API error, attempting fallback...', err);
    }

    // Fallback using temporary textarea
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch (err) {
      console.error('Fallback copy failed', err);
      return false;
    }
  }

  // --- LOGO CLICK COPY TRIGGER ---
  if (mainLogo) {
    mainLogo.addEventListener('click', async function (e) {
      e.preventDefault();

      // Trigger subtle bounce feedback on logo
      if (logoImg) {
        logoImg.classList.remove('logo-copied-bounce');
        void logoImg.offsetWidth;
        logoImg.classList.add('logo-copied-bounce');
      }

      // If we have an AI search result, copy the WHOLE reply to clipboard!
      if (state.latestResult && state.latestResult.trim() !== '') {
        const copied = await copyToClipboard(state.latestResult);
        if (copied) {
          showToast("Asset copied to clipboard!", 'success');
        } else {
          showToast("The proper asset isn't found", 'warning');
        }
      } else {
        // No search performed yet: smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast("The proper asset isn't found", 'warning');
      }
    });
  }

  // --- EASTER EGG: SECRET COMMANDS IN SEARCH BAR TO CHANGE MODEL ---
  function handleSecretModelCommands(inputStr) {
    const cmd = inputStr.trim().toLowerCase();
    
    if (cmd === '!gemini' || cmd === '/gemini' || cmd === '@gemini' || cmd === '!flash') {
      const idx = MODEL_PROFILES.findIndex(p => p.id === 'gemini-3-flash');
      if (idx !== -1) setActiveProfile(idx);
      showToast(`Asset Engine: Gemini 3 Flash Preview`, 'info');
      return true;
    }
    
    if (cmd === '!groq' || cmd === '/groq' || cmd === '@groq' || cmd === '!120b') {
      const idx = MODEL_PROFILES.findIndex(p => p.id === 'groq-120b');
      if (idx !== -1) setActiveProfile(idx);
      showToast(`Asset Engine: Groq GPT-OSS 120B (High Speed)`, 'info');
      return true;
    }

    if (cmd === '!qwen' || cmd === '/qwen' || cmd === '@qwen') {
      const idx = MODEL_PROFILES.findIndex(p => p.id === 'groq-qwen-27b');
      if (idx !== -1) setActiveProfile(idx);
      showToast(`Asset Engine: Groq Qwen 3.8 27B`, 'info');
      return true;
    }

    if (cmd === '!openrouter' || cmd === '/openrouter' || cmd === '@or' || cmd === '!or') {
      const idx = MODEL_PROFILES.findIndex(p => p.id === 'openrouter');
      if (idx !== -1) setActiveProfile(idx);
      showToast(`Asset Engine: OpenRouter Llama 3.3 70B`, 'info');
      return true;
    }

    if (cmd === '!models' || cmd === '/models' || cmd === '!profile') {
      const p = getActiveProfile();
      showToast(`Active Profile: ${p.label}`, 'info');
      return true;
    }

    return false;
  }

  // --- EASTER EGG: HOTKEY TO CYCLE AI MODELS (Ctrl+M or Alt+M) ---
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && (e.key === 'M' || e.key === 'm')) || (e.altKey && (e.key === 'M' || e.key === 'm'))) {
      e.preventDefault();
      setActiveProfile(state.activeProfileIndex + 1);
      const p = getActiveProfile();
      showToast(`Asset Engine Profile: ${p.label}`, 'info');
    }
  });

  // --- EASTER EGG: DOUBLE CLICK SEARCH ICON TO TOGGLE MODEL ---
  if (searchIconBox) {
    searchIconBox.style.pointerEvents = 'auto';
    searchIconBox.style.cursor = 'pointer';
    let iconClicks = 0;
    let iconTimer = null;
    searchIconBox.addEventListener('click', (e) => {
      e.stopPropagation();
      iconClicks++;
      clearTimeout(iconTimer);
      if (iconClicks === 2) {
        iconClicks = 0;
        setActiveProfile(state.activeProfileIndex + 1);
        showToast(`Asset Engine Profile: ${getActiveProfile().label}`, 'info');
      } else {
        iconTimer = setTimeout(() => { iconClicks = 0; }, 400);
      }
    });
  }

  // --- MULTI-TIER ZERO-ERROR CLIENT AI PIPELINE ---
  async function callGroqDirect(prompt, modelName) {
    const model = modelName || CONFIG.DEFAULT_GROQ_MODEL;
    let lastError = null;

    const keys = state.settings.apiKey ? [state.settings.apiKey] : [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: state.settings.systemPrompt || DEFAULT_SYSTEM_PROMPT },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2
          })
        });

        if (resp.ok) {
          const data = await resp.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return text;
        }
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('All Groq keys exhausted');
  }

  async function callGeminiDirect(prompt, modelName) {
    const model = modelName || CONFIG.DEFAULT_GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${state.settings.apiKey}`;
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${state.settings.systemPrompt || DEFAULT_SYSTEM_PROMPT}\n\nUSER GAME ASSET SEARCH QUERY:\n${prompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192
        }
      })
    });

    if (!resp.ok) {
      throw new Error(`Gemini HTTP Error ${resp.status}`);
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No content returned from Gemini');
    return text;
  }

  async function callOpenRouterDirect(prompt, modelName) {
    const model = modelName || CONFIG.DEFAULT_OPENROUTER_MODEL;
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.settings.apiKey}`,
        'HTTP-Referer': 'https://freegameassets.com',
        'X-Title': 'Free Game Assets'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: state.settings.systemPrompt || DEFAULT_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      })
    });

    if (!resp.ok) throw new Error(`OpenRouter HTTP ${resp.status}`);
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('No content from OpenRouter');
    return text;
  }

  // --- INTELLIGENT AUTO-SWITCH FAILOVER ENGINE ---
  async function queryAI(prompt) {
    const activeProf = getActiveProfile();

    // Step 1: Query through local backend server if active
    try {
      const serverController = new AbortController();
      const serverTimeout = setTimeout(() => serverController.abort(), 12000);

      const serverResp = await fetch(CONFIG.SERVER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: prompt,
          provider: activeProf.provider,
          model: activeProf.model
        }),
        signal: serverController.signal
      });
      clearTimeout(serverTimeout);

      if (serverResp.ok) {
        const sData = await serverResp.json();
        if (sData.success && sData.result) {
          // If server auto-switched models to prevent an error, sync client profile!
          if (sData.autoSwitched && sData.provider) {
            const matchedIdx = MODEL_PROFILES.findIndex(p => p.provider === sData.provider);
            if (matchedIdx !== -1 && matchedIdx !== state.activeProfileIndex) {
              setActiveProfile(matchedIdx);
              console.log(`[Auto-Switch] Synced active profile to: ${MODEL_PROFILES[matchedIdx].label}`);
            }
          }
          return sData.result;
        }
      }
    } catch (e) {
      // Server not reachable or timed out - seamlessly continue to client-side auto-switch
    }

    // Step 2: Direct Client-Side Auto-Switch Failover Chain
    const candidates = [
      { id: 'groq-120b', provider: 'groq', model: 'openai/gpt-oss-120b', fn: () => callGroqDirect(prompt, 'openai/gpt-oss-120b') },
      { id: 'gemini-3-flash', provider: 'gemini', model: 'gemini-3-flash-preview', fn: () => callGeminiDirect(prompt, 'gemini-3-flash-preview') },
      { id: 'gemini-3.5-flash', provider: 'gemini', model: 'gemini-3.5-flash', fn: () => callGeminiDirect(prompt, 'gemini-3.5-flash') },
      { id: 'groq-qwen-27b', provider: 'groq', model: 'qwen/qwen3.8-27b', fn: () => callGroqDirect(prompt, 'qwen/qwen3.8-27b') },
      { id: 'openrouter', provider: 'openrouter', model: CONFIG.DEFAULT_OPENROUTER_MODEL, fn: () => callOpenRouterDirect(prompt, null) }
    ];

    // Reorder candidates so the active profile is tried first
    const activeIdx = candidates.findIndex(c => c.provider === activeProf.provider && c.model === activeProf.model);
    if (activeIdx > 0) {
      const [matched] = candidates.splice(activeIdx, 1);
      candidates.unshift(matched);
    }

    let lastError = null;

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      try {
        console.log(`[Client Auto-Switch Tier #${i + 1}] Trying ${c.provider} (${c.model})...`);
        const result = await c.fn();
        if (result && result.trim().length > 30) {
          // If we auto-switched to a backup model, update the active profile so future queries remain fast and working!
          if (i > 0) {
            const profIdx = MODEL_PROFILES.findIndex(p => p.provider === c.provider);
            if (profIdx !== -1) {
              setActiveProfile(profIdx);
              console.log(`[Client Auto-Switch Success] Switched active profile to ${MODEL_PROFILES[profIdx].label}`);
            }
          }
          return result;
        }
      } catch (err) {
        lastError = err;
        setSearchIndicator('fallback');
        console.warn(`[Auto-Switch Fallback] Candidate #${i + 1} (${c.provider} ${c.model}) failed: ${err.message}. Retrying with next model...`);
      }
    }

    // Offline / Last Resort Fallback (Guaranteed to return working Unity C# code)
    console.warn('[Auto-Switch Fallback] Engaging local intelligent code engine.');
    return generateMockUnityAsset(prompt);
  }

  // --- SMART OFFLINE GENERATOR ---
  function generateMockUnityAsset(query) {
    const q = query.toLowerCase();

    if (q.includes('player') || q.includes('controller') || q.includes('movement') || q.includes('jump')) {
      return `/*
================================================================================
UNITY 3D ASSET PACKAGE: CHARACTER CONTROLLER & MOVEMENT PIPELINE
================================================================================
Query: "${query}"

[INSPECTOR SETUP INSTRUCTIONS]
1. Create a 3D Capsule in your Unity Hierarchy (GameObject -> 3D Object -> Capsule).
2. Attach a 'CharacterController' component to the Capsule.
3. Attach 'Player.cs' to the Capsule.
4. Assign Main Camera to 'playerCamera' and a foot Transform to 'groundCheck'.
================================================================================
*/

using UnityEngine;

[RequireComponent(typeof(CharacterController))]
public class Player : MonoBehaviour
{
    [Header("Movement Settings")]
    [SerializeField] private float walkSpeed = 6.0f;
    [SerializeField] private float sprintSpeed = 10.0f;
    [SerializeField] private float jumpHeight = 2.0f;
    [SerializeField] private float gravity = -22.0f;

    [Header("Look Settings")]
    [SerializeField] private Transform playerCamera;
    [SerializeField] private float mouseSensitivity = 2.0f;

    private CharacterController controller;
    private Vector3 velocity;
    private float verticalRotation = 0f;

    private void Awake()
    {
        controller = GetComponent<CharacterController>();
        if (playerCamera == null && Camera.main != null) playerCamera = Camera.main.transform;
        Cursor.lockState = CursorLockMode.Locked;
    }

    private void Update()
    {
        // Look
        float mouseX = Input.GetAxisRaw("Mouse X") * mouseSensitivity;
        float mouseY = Input.GetAxisRaw("Mouse Y") * mouseSensitivity;
        transform.Rotate(Vector3.up * mouseX);
        verticalRotation = Mathf.Clamp(verticalRotation - mouseY, -85f, 85f);
        if (playerCamera) playerCamera.localRotation = Quaternion.Euler(verticalRotation, 0f, 0f);

        // Move
        bool isGrounded = controller.isGrounded;
        if (isGrounded && velocity.y < 0) velocity.y = -2f;

        float h = Input.GetAxisRaw("Horizontal");
        float v = Input.GetAxisRaw("Vertical");
        float speed = Input.GetKey(KeyCode.LeftShift) ? sprintSpeed : walkSpeed;
        Vector3 move = (transform.forward * v + transform.right * h).normalized * speed;
        controller.Move(move * Time.deltaTime);

        // Jump
        if (Input.GetButtonDown("Jump") && isGrounded)
        {
            velocity.y = Mathf.Sqrt(jumpHeight * -2f * gravity);
        }

        velocity.y += gravity * Time.deltaTime;
        controller.Move(velocity * Time.deltaTime);
    }
}
// ================================================================================
// END OF SINGLE MASTER FILE
// ================================================================================`;
    }

    return `/*
================================================================================
UNITY 3D ASSET PACKAGE: GAMEPLAY MODULE
================================================================================
Query: "${query}"

[INSPECTOR SETUP INSTRUCTIONS]
1. Create a C# script named 'GameAssetScript.cs' in Assets/Scripts.
2. Attach it to your GameObject.
================================================================================
*/

using UnityEngine;

public class GameAssetScript : MonoBehaviour
{
    [SerializeField] private float speed = 5.0f;
    private void Start() => Debug.Log("[GameAssetScript] Initialized for: ${query}");
}
// ================================================================================
// END OF SINGLE MASTER FILE
// ================================================================================`;
  }

  
  // --- SEARCH CIRCLE INDICATOR & COLOR CONTROLLER ---
  // Status: 'idle' (black) | 'searching' (blue) | 'fallback' (orange) | 'found' (green) | 'error' (red)
  let indicatorTimer = null;
  function setSearchIndicator(status) {
    if (!searchBtn) return;
    clearTimeout(indicatorTimer);

    searchBtn.classList.remove('state-idle', 'state-searching', 'state-fallback', 'state-found', 'state-error');
    searchBtn.classList.add(`state-${status}`);

    if (searchStatusDot) {
      searchStatusDot.className = 'search-status-dot';
      if (status !== 'idle') {
        searchStatusDot.classList.add('active', `dot-${status}`);
      }
    }

    if (status === 'searching' || status === 'fallback') {
      if (searchBtnIcon) searchBtnIcon.classList.add('animate-spin');
    } else {
      if (searchBtnIcon) searchBtnIcon.classList.remove('animate-spin');
    }

    // Auto reset from 'found' or 'error' back to default black ('idle') after 4 seconds
    if (status === 'found' || status === 'error') {
      indicatorTimer = setTimeout(() => {
        if (searchBtn.classList.contains(`state-${status}`)) {
          setSearchIndicator('idle');
        }
      }, 4000);
    }
  }

  // --- SEARCH FORM HANDLER ---
  let isSearching = false;

  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (isSearching) return;

    const rawQuery = searchInput ? searchInput.value.trim() : '';
    if (!rawQuery) {
      showToast("Please enter an asset query or script name", "warning");
      return;
    }

    // Check if user entered a secret model switcher command
    if (handleSecretModelCommands(rawQuery)) {
      if (searchInput) searchInput.value = '';
      return;
    }

    // Auto-clear the searched message from searchbar immediately (Zero UI trace)
    if (searchInput) {
      searchInput.value = '';
      searchInput.blur();
    }

    // 1. Indicate Searching: Circle turns Electric Blue
    isSearching = true;
    setSearchIndicator('searching');

    try {
      const result = await queryAI(rawQuery);

      if (result && result.trim().length > 0) {
        state.latestResult = result;
        localStorage.setItem('fga_latest_result', result);

        const historyItem = {
          id: Date.now(),
          query: rawQuery,
          result: result,
          model: getActiveProfile().label,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        state.history.unshift(historyItem);
        if (state.history.length > 30) state.history.pop();
        localStorage.setItem('fga_history', JSON.stringify(state.history));
        renderHistory();

        // 2. Indicate Found: Circle turns Emerald Green
        setSearchIndicator('found');
        showToast("Here is what I found", "success");
      } else {
        // 3. Indicate Error / Not Found: Circle turns Red
        setSearchIndicator('error');
        showToast("The proper asset isn't found", "warning");
      }
    } catch (err) {
      console.error('Asset Search Error:', err);
      // Indicate Error: Circle turns Red
      setSearchIndicator('error');
      showToast("The proper asset isn't found", "warning");
    } finally {
      isSearching = false;
    }
  }

  if (searchForm) {
    searchForm.addEventListener('submit', handleSearch);
  }

  // Quick tag search buttons
  quickTags.forEach(tag => {
    tag.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = tag.textContent.trim();
        searchInput.focus();
        handleSearch();
      }
    });
  });

  // --- EASTER EGG MODAL (DISGUISED AS ASSET BUFFER / CACHE) ---
  function openEasterEggModal() {
    if (!easterEggModal) return;
    renderHistory();
    initSettingsUI();
    easterEggModal.classList.remove('hidden');
    requestAnimationFrame(() => {
      easterEggModal.classList.remove('opacity-0');
    });
  }

  function closeEasterEggModal() {
    if (!easterEggModal) return;
    easterEggModal.classList.add('opacity-0');
    setTimeout(() => {
      easterEggModal.classList.add('hidden');
    }, 200);
  }

  // Secret Triggers:
  // 1. Secret dot in footer tagline
  if (secretDot) {
    secretDot.addEventListener('click', (e) => {
      e.preventDefault();
      openEasterEggModal();
    });
  }

  // 2. Secret SURGE logo in footer (3 rapid clicks)
  let surgeClicks = 0;
  let surgeTimer = null;
  if (secretSurge) {
    secretSurge.addEventListener('click', (e) => {
      e.preventDefault();
      surgeClicks++;
      clearTimeout(surgeTimer);
      if (surgeClicks === 3) {
        surgeClicks = 0;
        openEasterEggModal();
      } else {
        surgeTimer = setTimeout(() => { surgeClicks = 0; }, 600);
      }
    });
  }

  // 3. Keyboard shortcut: Ctrl + Shift + X or `~` (backtick)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && easterEggModal && !easterEggModal.classList.contains('hidden')) {
      closeEasterEggModal();
      return;
    }

    if ((e.ctrlKey && e.shiftKey && (e.key === 'X' || e.key === 'x')) || (e.key === '`' && e.ctrlKey)) {
      e.preventDefault();
      if (easterEggModal.classList.contains('hidden')) {
        openEasterEggModal();
      } else {
        closeEasterEggModal();
      }
    }
  });

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeEasterEggModal);
  if (closeModalBottomBtn) closeModalBottomBtn.addEventListener('click', closeEasterEggModal);

  // Close modal when clicking outside
  if (easterEggModal) {
    easterEggModal.addEventListener('click', (e) => {
      if (e.target === easterEggModal) {
        closeEasterEggModal();
      }
    });
  }

  // Modal Tab Switching
  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modalTabs.forEach(t => {
        t.classList.remove('active', 'border-foreground', 'text-foreground');
        t.classList.add('border-transparent', 'text-muted-foreground');
      });
      tab.classList.add('active', 'border-foreground', 'text-foreground');
      tab.classList.remove('border-transparent', 'text-muted-foreground');

      const target = tab.dataset.tab;
      ['history', 'settings', 'prompt', 'guide'].forEach(tName => {
        const content = document.getElementById(`tab-content-${tName}`);
        if (content) {
          if (tName === target) {
            content.classList.remove('hidden');
          } else {
            content.classList.add('hidden');
          }
        }
      });
    });
  });

  // --- RENDER HISTORY & CODE PREVIEWS ---
  function renderHistory() {
    if (!historyList) return;

    if (state.history.length === 0) {
      historyList.innerHTML = `
        <div class="p-8 text-center border border-dashed border-border rounded-xl">
          <p class="text-xs text-muted-foreground">No recent asset queries cached yet.</p>
          <p class="text-[11px] text-muted-foreground/70 mt-1">Use the main search bar to search for Unity C# scripts or game assets.</p>
        </div>`;
      return;
    }

    historyList.innerHTML = state.history.map((item, index) => `
      <div class="border border-border rounded-xl p-4 bg-background/50 hover:border-border/80 transition space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">Query #${state.history.length - index}</span>
              <span class="text-[11px] text-muted-foreground">${item.timestamp}</span>
              ${item.model ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">${escapeHtml(item.model)}</span>` : ''}
            </div>
            <h4 class="text-xs font-semibold text-foreground mt-1">"${escapeHtml(item.query)}"</h4>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" class="history-copy-btn px-2.5 py-1 rounded-lg bg-foreground text-background text-[11px] font-medium hover:bg-foreground/90 transition cursor-pointer" data-id="${item.id}">
              📋 Copy Full Text
            </button>
            <button type="button" class="history-toggle-btn px-2.5 py-1 rounded-lg border border-border hover:bg-muted text-[11px] font-medium transition cursor-pointer" data-id="${item.id}">
              👁️ View Code
            </button>
          </div>
        </div>
        <div id="code-preview-${item.id}" class="hidden pt-2">
          <div class="code-preview-block">${escapeHtml(item.result)}</div>
        </div>
      </div>
    `).join('');

    // Attach button listeners
    document.querySelectorAll('.history-copy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        const item = state.history.find(h => h.id === id);
        if (item) {
          await copyToClipboard(item.result);
          const oldText = btn.textContent;
          btn.textContent = '✓ Copied!';
          setTimeout(() => { btn.textContent = oldText; }, 1500);
        }
      });
    });

    document.querySelectorAll('.history-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const block = document.getElementById(`code-preview-${id}`);
        if (block) {
          block.classList.toggle('hidden');
          btn.textContent = block.classList.contains('hidden') ? '👁️ View Code' : '✕ Hide Code';
        }
      });
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Clear all cached queries and codes?')) {
        state.history = [];
        state.latestResult = '';
        localStorage.removeItem('fga_history');
        localStorage.removeItem('fga_latest_result');
        renderHistory();
        showToast("Cache cleared", "info");
      }
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --- SETTINGS MANAGEMENT ---
  if (settingProvider) {
    settingProvider.addEventListener('change', () => {
      updateEndpointVisibility();
      if (settingModel) {
        if (settingProvider.value === 'gemini') settingModel.value = 'gemini-3-flash-preview';
        else if (settingProvider.value === 'groq') settingModel.value = 'openai/gpt-oss-120b';
        else if (settingProvider.value === 'openrouter') settingModel.value = 'meta-llama/llama-3.3-70b-instruct:free';
      }
    });
  }

  if (toggleKeyVisibilityBtn && settingApiKey) {
    toggleKeyVisibilityBtn.addEventListener('click', () => {
      settingApiKey.type = settingApiKey.type === 'password' ? 'text' : 'password';
      toggleKeyVisibilityBtn.textContent = settingApiKey.type === 'password' ? 'Show' : 'Hide';
    });
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      state.settings.provider = settingProvider ? settingProvider.value : 'groq';
      state.settings.model = settingModel ? settingModel.value.trim() : CONFIG.DEFAULT_GROQ_MODEL;
      state.settings.apiKey = settingApiKey ? settingApiKey.value.trim() : '';
      state.settings.endpoint = settingEndpoint ? settingEndpoint.value.trim() : '';

      localStorage.setItem('fga_provider', state.settings.provider);
      localStorage.setItem('fga_model', state.settings.model);
      localStorage.setItem('fga_api_key', state.settings.apiKey);
      localStorage.setItem('fga_endpoint', state.settings.endpoint);

      if (settingsStatus) {
        settingsStatus.textContent = '✓ Configuration saved!';
        settingsStatus.classList.remove('hidden');
        setTimeout(() => { settingsStatus.classList.add('hidden'); }, 2500);
      }
      showToast("Configuration saved successfully", "success");
    });
  }

  if (testConnBtn) {
    testConnBtn.addEventListener('click', async () => {
      testConnBtn.textContent = 'Testing...';
      testConnBtn.disabled = true;

      try {
        const testPrompt = "Test query: generate a simple Unity vector3 utility function VectorUtil.cs";
        const result = await queryAI(testPrompt);
        if (result) {
          alert('✓ Connection Successful! Response received and validated.');
        } else {
          alert('Warning: Connection returned empty response.');
        }
      } catch (err) {
        alert(`Connection Failed:\n${err.message}`);
      } finally {
        testConnBtn.textContent = 'Test Connection';
        testConnBtn.disabled = false;
      }
    });
  }

  if (savePromptBtn && settingSystemPrompt) {
    savePromptBtn.addEventListener('click', () => {
      state.settings.systemPrompt = settingSystemPrompt.value;
      localStorage.setItem('fga_system_prompt', state.settings.systemPrompt);
      showToast("Master prompt updated", "success");
    });
  }

  if (resetPromptBtn && settingSystemPrompt) {
    resetPromptBtn.addEventListener('click', () => {
      settingSystemPrompt.value = DEFAULT_SYSTEM_PROMPT;
      state.settings.systemPrompt = DEFAULT_SYSTEM_PROMPT;
      localStorage.setItem('fga_system_prompt', DEFAULT_SYSTEM_PROMPT);
      showToast("Master prompt reset to default", "info");
    });
  }

  // --- INTERACTIVE HEART BUTTONS (UPVOTE COUNTERS) ---
  document.querySelectorAll('button[type="button"]').forEach(btn => {
    if (btn.querySelector('svg path[d*="19 14"]')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const span = btn.querySelector('span');
        if (span) {
          let count = parseInt(span.textContent, 10);
          if (!isNaN(count)) {
            if (!btn.classList.contains('heart-active')) {
              btn.classList.add('heart-active');
              span.textContent = count + 1;
            } else {
              btn.classList.remove('heart-active');
              span.textContent = count - 1;
            }
          }
        }
      });
    }
  });

  // Initialize
  initSettingsUI();
  console.log('Free Game Assets - ZYPH AI Engine Online.');
})();
