'use strict';

const CLAUDE_PROXY_URL = 'https://k3aria2qw4.execute-api.eu-central-1.amazonaws.com/';

let conversationHistory = [];
let isLoading = false;

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Escape HTML first (XSS safety), then convert newlines to <br> for readability.
// Only <br> tags are ever injected — no script execution is possible.
function renderContent(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function getMessages() {
  return document.getElementById('assistant-messages');
}

function scrollToBottom() {
  const el = getMessages();
  el.scrollTop = el.scrollHeight;
}

function appendMessage(role, content) {
  const div = document.createElement('div');
  div.className = `assistant-msg assistant-msg--${role}`;
  div.innerHTML = renderContent(content);
  getMessages().appendChild(div);
  scrollToBottom();
}

function showTyping() {
  const div = document.createElement('div');
  div.id = 'assistant-typing';
  div.className = 'assistant-msg assistant-msg--assistant assistant-msg--typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  getMessages().appendChild(div);
  scrollToBottom();
}

function hideTyping() {
  const el = document.getElementById('assistant-typing');
  if (el) el.remove();
}

function autoResize(input) {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 96) + 'px';
}

function setSendDisabled(disabled) {
  document.getElementById('assistant-send').disabled = disabled;
}

async function sendMessage() {
  if (isLoading) return;

  const input = document.getElementById('assistant-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  autoResize(input);

  conversationHistory.push({ role: 'user', content: text });
  appendMessage('user', text);
  isLoading = true;
  setSendDisabled(true);
  showTyping();

  try {
    const res = await fetch(CLAUDE_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory }),
    });

    hideTyping();

    if (!res.ok) throw new Error(`${res.status}`);

    const data = await res.json();
    const reply = data.content || 'Sorry, I could not get a response.';
    conversationHistory.push({ role: 'assistant', content: reply });
    appendMessage('assistant', reply);
  } catch {
    hideTyping();
    conversationHistory.pop();
    appendMessage('assistant', 'Sorry, I\'m having trouble connecting right now. Please try again.');
  } finally {
    isLoading = false;
    setSendDisabled(false);
    input.focus();
  }
}

function lockBodyScroll() {
  document.body.classList.add('scroll-locked');
}

function unlockBodyScroll() {
  document.body.classList.remove('scroll-locked');
}

function openPanel() {
  lockBodyScroll();
  document.getElementById('assistant-panel').classList.add('assistant-panel--open');
  document.getElementById('assistant-fab').setAttribute('aria-expanded', 'true');
  setTimeout(() => document.getElementById('assistant-input').focus(), 300);
}

function closePanel() {
  document.getElementById('assistant-panel').classList.remove('assistant-panel--open');
  document.getElementById('assistant-fab').setAttribute('aria-expanded', 'false');
  document.getElementById('assistant-input').blur();
  unlockBodyScroll();
}

function initAssistant() {
  const fab = document.getElementById('assistant-fab');
  const input = document.getElementById('assistant-input');
  const panel = document.getElementById('assistant-panel');

  // Prevent panel touches from bubbling to the document-level pull-to-refresh
  // listener. passive:true on touchstart/touchmove is fine — we aren't calling
  // preventDefault, just stopping propagation.
  panel.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  panel.addEventListener('touchmove',  e => e.stopPropagation(), { passive: true });
  panel.addEventListener('touchend',   e => e.stopPropagation());

  fab.addEventListener('click', () => {
    panel.classList.contains('assistant-panel--open') ? closePanel() : openPanel();
  });

  document.getElementById('assistant-close').addEventListener('click', closePanel);

  document.getElementById('assistant-send').addEventListener('click', sendMessage);

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('input', () => autoResize(input));

  // Clear any chat history previously saved to localStorage
  try { localStorage.removeItem('europe-2026-chat-history'); } catch {}

  // Shift panel up when iOS keyboard appears so the input stays visible
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const keyboardHeight = window.innerHeight
        - window.visualViewport.height
        - window.visualViewport.offsetTop;
      document.getElementById('assistant-panel').style.bottom =
        keyboardHeight > 0 ? `${keyboardHeight}px` : '';
    });
  }
}

window.addEventListener('load', initAssistant);
