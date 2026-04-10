const JOURNAL_KEY = "ad_journal_entries_v1";
const GALLERY_KEY = "ad_gallery_items_v1";
const VOICE_KEY = "ad_voice_notes_v1";

function formatNow() {
  return new Date().toLocaleString();
}
function readStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
}
function writeStorage(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* Journal */
function renderJournal() {
  const container = document.getElementById("entries");
  const countEl = document.getElementById("entryCount");
  if (!container || !countEl) return;
  const entries = readStorage(JOURNAL_KEY);
  countEl.textContent = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;
  if (!entries.length) {
    container.className = "stack-list empty-state";
    container.innerHTML = "<p>No journal entries yet. Add the first one above.</p>";
    return;
  }
  container.className = "stack-list";
  container.innerHTML = entries.map(entry => `
    <article class="entry-card">
      <div class="entry-top">
        <div>
          <h3>${escapeHtml(entry.title)}</h3>
          <div class="tag">${escapeHtml(entry.category)}</div>
        </div>
        <div class="entry-date">${escapeHtml(entry.date)}</div>
      </div>
      <p>${escapeHtml(entry.content).replace(/\n/g, "<br>")}</p>
    </article>
  `).join("");
}
function saveJournalEntry() {
  const titleEl = document.getElementById("title");
  const categoryEl = document.getElementById("category");
  const contentEl = document.getElementById("content");
  if (!titleEl || !categoryEl || !contentEl) return;
  const title = titleEl.value.trim();
  const category = categoryEl.value.trim();
  const content = contentEl.value.trim();
  if (!title || !content) { alert("Please add both a title and entry text."); return; }
  const entries = readStorage(JOURNAL_KEY);
  entries.unshift({ title, category, content, date: formatNow() });
  writeStorage(JOURNAL_KEY, entries);
  titleEl.value = ""; contentEl.value = ""; categoryEl.value = "Observation";
  renderJournal();
}
function clearJournal() {
  if (!confirm("Clear all journal entries?")) return;
  localStorage.removeItem(JOURNAL_KEY);
  renderJournal();
}

/* Gallery */
function renderGallery() {
  const grid = document.getElementById("galleryGrid");
  const countEl = document.getElementById("galleryCount");
  if (!grid || !countEl) return;
  const items = readStorage(GALLERY_KEY);
  countEl.textContent = `${items.length} ${items.length === 1 ? "photo" : "photos"}`;
  if (!items.length) {
    grid.className = "gallery-grid empty-state";
    grid.innerHTML = "<p>No photos yet. Add one above.</p>";
    return;
  }
  grid.className = "gallery-grid";
  grid.innerHTML = items.map(item => `
    <article class="gallery-card">
      <img src="${item.image}" alt="${escapeHtml(item.caption || "Saved photo")}" />
      <div class="gallery-meta">
        <h3>${escapeHtml(item.caption || "Memory")}</h3>
        <div class="entry-date">${escapeHtml(item.date)}</div>
      </div>
    </article>
  `).join("");
}
function savePhoto() {
  const fileInput = document.getElementById("photoInput");
  const captionInput = document.getElementById("photoCaption");
  if (!fileInput || !captionInput) return;
  const file = fileInput.files[0];
  const caption = captionInput.value.trim();
  if (!file) { alert("Please choose an image first."); return; }
  const reader = new FileReader();
  reader.onload = function(event) {
    const items = readStorage(GALLERY_KEY);
    items.unshift({ caption: caption || "Memory", image: event.target.result, date: formatNow() });
    writeStorage(GALLERY_KEY, items);
    captionInput.value = ""; fileInput.value = "";
    renderGallery();
  };
  reader.readAsDataURL(file);
}
function clearGallery() {
  if (!confirm("Clear all gallery photos?")) return;
  localStorage.removeItem(GALLERY_KEY);
  renderGallery();
}

/* Voice */
let mediaRecorder = null;
let recordingChunks = [];
let activeStream = null;

function renderVoiceNotes() {
  const list = document.getElementById("voiceList");
  const countEl = document.getElementById("voiceCount");
  if (!list || !countEl) return;
  const notes = readStorage(VOICE_KEY);
  countEl.textContent = `${notes.length} ${notes.length === 1 ? "note" : "notes"}`;
  if (!notes.length) {
    list.className = "stack-list empty-state";
    list.innerHTML = "<p>No voice notes yet. Record one above.</p>";
    return;
  }
  list.className = "stack-list";
  list.innerHTML = notes.map(note => `
    <article class="voice-card">
      <div class="voice-top">
        <div><h3>${escapeHtml(note.title || "Voice Note")}</h3></div>
        <div class="voice-date">${escapeHtml(note.date)}</div>
      </div>
      <audio class="audio-player" controls src="${note.audio}"></audio>
    </article>
  `).join("");
}
async function startRecording() {
  const statusEl = document.getElementById("recordingStatus");
  const startBtn = document.getElementById("startRecordingBtn");
  const stopBtn = document.getElementById("stopRecordingBtn");
  try {
    activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingChunks = [];
    mediaRecorder = new MediaRecorder(activeStream);
    mediaRecorder.ondataavailable = event => { if (event.data.size > 0) recordingChunks.push(event.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordingChunks, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = () => {
        const title = (document.getElementById("voiceTitle")?.value || "").trim() || "Voice Note";
        const notes = readStorage(VOICE_KEY);
        notes.unshift({ title, audio: reader.result, date: formatNow() });
        writeStorage(VOICE_KEY, notes);
        if (document.getElementById("voiceTitle")) document.getElementById("voiceTitle").value = "";
        renderVoiceNotes();
      };
      reader.readAsDataURL(blob);
      if (activeStream) { activeStream.getTracks().forEach(track => track.stop()); activeStream = null; }
    };
    mediaRecorder.start();
    if (statusEl) statusEl.textContent = "Recording...";
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
  } catch (err) {
    alert("Microphone access was blocked or not available in this browser.");
  }
}
function stopRecording() {
  const statusEl = document.getElementById("recordingStatus");
  const startBtn = document.getElementById("startRecordingBtn");
  const stopBtn = document.getElementById("stopRecordingBtn");
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  if (statusEl) statusEl.textContent = "Saved voice note";
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
}
function clearVoiceNotes() {
  if (!confirm("Clear all voice notes?")) return;
  localStorage.removeItem(VOICE_KEY);
  renderVoiceNotes();
}

document.addEventListener("DOMContentLoaded", () => {
  renderJournal();
  renderGallery();
  renderVoiceNotes();
  document.getElementById("saveEntryBtn")?.addEventListener("click", saveJournalEntry);
  document.getElementById("clearEntriesBtn")?.addEventListener("click", clearJournal);
  document.getElementById("savePhotoBtn")?.addEventListener("click", savePhoto);
  document.getElementById("clearGalleryBtn")?.addEventListener("click", clearGallery);
  document.getElementById("startRecordingBtn")?.addEventListener("click", startRecording);
  document.getElementById("stopRecordingBtn")?.addEventListener("click", stopRecording);
  document.getElementById("clearVoiceBtn")?.addEventListener("click", clearVoiceNotes);
});
