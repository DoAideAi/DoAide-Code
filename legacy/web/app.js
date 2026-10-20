(() => {
  const $ = (selector) => document.querySelector(selector);
  const messagesEl = $("#chat-messages");
  const input = $("#chat-input");
  const form = $("#chat-form");
  const sendButton = $("#send-button");
  const toast = $("#toast");
  const storageKey = "doaide-code.chat.v1";
  let conversation = [];
  let transcript = [];
  let lastRoute = null;
  let busy = false;
  let toastTimer;

  function persistState() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        conversation,
        transcript,
        lastRoute,
      }));
    } catch (_) {
      // Chat still works if browser storage is disabled or full.
    }
  }

  function restoreState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (!saved || typeof saved !== "object") return;
      if (Array.isArray(saved.conversation)) {
        conversation = saved.conversation.filter((message) =>
          message && ["user", "assistant"].includes(message.role) && typeof message.content === "string"
        ).slice(-24);
      }
      if (Array.isArray(saved.transcript)) {
        transcript = saved.transcript.filter((message) =>
          message && ["user", "assistant"].includes(message.role) && typeof message.text === "string"
        ).slice(-48);
      }
      if (saved.lastRoute && ["codex", "claude", "ollama"].includes(saved.lastRoute.provider)) {
        lastRoute = { provider: saved.lastRoute.provider, model: String(saved.lastRoute.model || "") };
      }
      if (transcript.length) {
        messagesEl.replaceChildren();
        for (const message of transcript) addMessage(message.role, message.text, message.meta || "");
      }
    } catch (_) {
      // Ignore malformed or unavailable browser storage and start a fresh chat.
    }
  }

  function rememberMessage(role, text, meta = "") {
    transcript.push({ role, text, meta });
    if (transcript.length > 48) transcript = transcript.slice(-48);
    persistState();
  }

  function showToast(message, error = false) {
    toast.textContent = message;
    toast.classList.toggle("error", error);
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 3200);
  }

  function addMessage(role, text, meta = "") {
    const bubble = document.createElement("div");
    bubble.className = `message ${role}`;
    if (meta) {
      const label = document.createElement("span");
      label.className = "message-meta";
      label.textContent = meta;
      bubble.append(label);
    }
    if (role === "assistant") {
      const chunks = String(text).split(/```[^\n]*\n([\s\S]*?)```/g);
      chunks.forEach((chunk, index) => {
        if (index % 2) {
          const pre = document.createElement("pre");
          const code = document.createElement("code");
          code.textContent = chunk;
          pre.append(code);
          bubble.append(pre);
        } else if (chunk) {
          bubble.append(document.createTextNode(chunk));
        }
      });
    } else {
      bubble.append(document.createTextNode(text));
    }
    messagesEl.append(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function setBusy(value) {
    busy = value;
    sendButton.disabled = value;
    input.disabled = value;
    sendButton.textContent = value ? "…" : "↑";
  }

  function updatePrivacyHint() {
    $("#privacy-hint").textContent = "Routine requests stay local. Doaide may send project context to a cloud CLI for harder tasks or when you ask for one.";
  }

  async function refreshStatus() {
    try {
      const response = await fetch("/api/config", { cache: "no-store" });
      if (!response.ok) throw new Error("Local server is unavailable.");
      const config = await response.json();
      $("#workspace-path").textContent = config.workspace;
      $("#workspace-detail").textContent = `${config.fileCount} source files available as project context`;
      const providers = config.providers || {};
      const statuses = [
        `${providers.ollama?.models?.length || 0} local`,
        providers.codex?.configured ? "GPT ready" : "GPT unavailable",
        providers.claude?.configured ? "Claude ready" : "Claude unavailable",
      ];
      $("#service-dot").className = providers.ollama?.models?.length ? "online" : "offline";
      $("#service-state").textContent = statuses.join(" · ");
      updatePrivacyHint();
    } catch (error) {
      $("#service-dot").className = "offline";
      $("#service-state").textContent = error.message;
    }
  }

  async function sendMessage(text) {
    const content = text.trim();
    if (!content || busy) return;
    if (messagesEl.querySelector(".welcome-message")) messagesEl.replaceChildren();
    conversation.push({ role: "user", content });
    addMessage("user", content);
    rememberMessage("user", content);
    input.value = "";
    input.style.height = "auto";
    setBusy(true);
    const thinking = addMessage("assistant", "Choosing the right model…", "DOAIDE CODE");
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "auto", messages: conversation.slice(-24), lastRoute }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
      lastRoute = { provider: result.provider, model: result.model };
      thinking.remove();
      const label = result.cloud ? "DOAIDE CODE · CLOUD" : "DOAIDE CODE · LOCAL";
      const changed = result.changedFiles || [];
      addMessage("assistant", result.reply, changed.length ? `${label} · UPDATED ${changed.length} FILE${changed.length === 1 ? "" : "S"}` : label);
      conversation.push({ role: "assistant", content: result.reply });
      if (conversation.length > 24) conversation = conversation.slice(-24);
      rememberMessage("assistant", result.reply, changed.length ? `${label} · UPDATED ${changed.length} FILE${changed.length === 1 ? "" : "S"}` : label);
    } catch (error) {
      thinking.remove();
      const errorText = `I couldn't reach that model: ${error.message}`;
      addMessage("assistant", errorText, "CONNECTION ISSUE");
      rememberMessage("assistant", errorText, "CONNECTION ISSUE");
      conversation.pop();
      persistState();
      showToast(error.message, true);
    } finally {
      setBusy(false);
      input.focus();
    }
  }

  async function updateFolder(action) {
    try {
      const response = await fetch("/api/workspace", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not select folder.");
      await refreshStatus();
      showToast("Project folder updated.");
    } catch (error) {
      showToast(error.message, true);
    }
  }

  $("#choose-folder").addEventListener("click", () => updateFolder("choose"));
  $("#default-folder").addEventListener("click", () => updateFolder("default"));
  $("#refresh-status").addEventListener("click", refreshStatus);
  $("#new-chat").addEventListener("click", () => {
    conversation = [];
    transcript = [];
    lastRoute = null;
    messagesEl.innerHTML = '<div class="welcome-message"><span class="welcome-mark">✳</span><strong>What are you working on?</strong><p>Ask about this project, request a code change, or get help debugging. Requested changes are written into the selected folder.</p></div>';
    persistState();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(input.value);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
  });
  restoreState();
  refreshStatus();
})();
