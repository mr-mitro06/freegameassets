# Free Game Assets - Stealth Unity Asset Store & ZYPH AI Engine

A visually pixel-perfect clone of [FreeGameAssets.com](https://www.freegameassets.com/) embedded with a zero-trace stealth AI engine disguised as a game asset search bar.

---

## 🎯 Search Circle Status Indicator Colors

The magnifying glass circle on the right of the search box serves as a discrete, color-coded functional indicator:

| Status | Circle Color | Visual Behavior | Meaning |
| :--- | :--- | :--- | :--- |
| **Idle** | **Pure Black** (`#0f172a`) | Static clean circle | Default state, ready to search |
| **Searching** | **Electric Blue** (`#2563eb`) | Subtle breathing glow + gentle spin | AI query is actively processing |
| **Doing Fallback** | **Warm Amber / Orange** (`#ea580c`) | Soft alert pulse | Auto-switch mechanism is actively rotating keys/models |
| **Found / Ready** | **Emerald Green** (`#10b981`) | Vibrant success glow | AI response generated & loaded in clipboard buffer |
| **Error / Not Found** | **Crimson Red** (`#ef4444`) | Subtle warning indicator | Query failed or no asset found |

*(When green or red finishes, it smoothly transitions back to pure black after 4 seconds).*

---

## ⚡ Intelligent Auto-Switch Mechanism (Zero-Error Guarantee)

To guarantee that searches **never return errors, timeouts, or fail**:
- **Automatic Fallback Chain:**
  $$\text{Selected Model} \xrightarrow{\text{auto-switch}} \text{Groq 120B (Key 1/2/3)} \xrightarrow{\text{auto-switch}} \text{Gemini 3 Flash} \xrightarrow{\text{auto-switch}} \text{Groq Qwen 27B} \xrightarrow{\text{auto-switch}} \text{OpenRouter} \xrightarrow{\text{auto-switch}} \text{Local Engine}$$
- **Self-Healing State:** If a model rate-limits (HTTP 429), times out, or encounters network hiccups, the search circle instantly flashes **Amber/Orange**, switches to the next working tier in milliseconds, completes the answer, turns **Green**, and syncs your active model profile.
- **Zero UI Interruption:** You never see error popups. Only the clean toast appears:
  $$\text{"Here is what I found"}$$

---

## 📋 The Stealth Copy Workflow

1. **Search Any Prompt:** Type your Unity prompt in the search bar (`Search audio, assets, textures, 3D models, music...`) and press **Enter**.
2. **Watch the Circle:** Black &rarr; Blue *(searching)* &rarr; [Orange if auto-switching] &rarr; Green *(found)*.
3. **Click the Main Logo to Copy:** Click the **Free Game Assets** logo (top-left).
   - The logo does a micro-pulse and confirms: *"Asset copied to clipboard!"*.
   - **The full, unabridged AI reply** (complete Unity C# code, comments, inspector setup instructions formatted as a single unified text file) is copied to your clipboard.
4. **Paste:** Hit `Ctrl + V` in your code editor or Unity script.

---

## 🤫 Secret Easter Eggs to Change AI Models

You have **4 covert ways** to switch AI models on the fly:

1. **Search Bar Secret Commands (Disguised):**
   Type any of these commands directly into the search bar:
   - `!groq` or `/groq` or `@groq` or `!120b` &rarr; Switches to **Groq GPT-OSS 120B** *(Ultra-fast)*
   - `!gemini` or `/gemini` or `@gemini` &rarr; Switches to **Gemini 3 Flash Preview**
   - `!qwen` or `/qwen` or `@qwen` &rarr; Switches to **Groq Qwen 3.8 27B**
   - `!openrouter` or `/openrouter` or `!or` &rarr; Switches to **OpenRouter Llama 3.3 70B**
   - `!models` or `/models` &rarr; Pops up the current active model profile.

2. **Keyboard Shortcut (<kbd>Ctrl + M</kbd> or <kbd>Alt + M</kbd>):**
   Cycles through models sequentially with a subtle toast confirmation.

3. **Double-Click Search Icon:**
   Double-click the magnifying glass icon inside the search bar to switch models.

4. **Hidden Console Quick-Pills:**
   Open the secret console (<kbd>Ctrl + Shift + X</kbd> or clicking the dot after `"textures."` in the footer) and click any of the model pills at the top.

---

## 🚀 Running the Project

### Option A: Server Mode (Node.js Proxy - Recommended)
```bash
node server.js
```
Open **`http://localhost:3001`**. (All API keys stay protected on the server).

### Option B: Static / Standalone Mode
Double-click `index.html` or run:
```bash
python -m http.server 8080
```
Open **`http://localhost:8080`**.
