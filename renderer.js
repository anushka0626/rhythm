// renderer.js
const api = window.electronAPI || {
    loginWithSpotify: () => {},
    onSpotifyConnected: () => {},
    fetchPlaylist: async () => ({ items: [] }),
    playHook: async () => {},
    loadStore: async () => ({}),
    saveStore: async () => ({}),
    exportSession: async () => ({ canceled: true }),
    importSession: async () => ({ canceled: true })
};

const button = document.querySelector("#spotifyBtn");
const status = document.querySelector("#status");
const playlistBtn = document.querySelector("#loadPlaylistBtn");
const playlistInput = document.querySelector("#playlistInput");
const songList = document.querySelector("#songList");
const queueList = document.querySelector("#queueList");
const startSessionBtn = document.querySelector("#startSessionBtn");
const sessionNameInput = document.querySelector("#sessionNameInput");
const savedSessionSelect = document.querySelector("#savedSessionSelect");
const saveSessionBtn = document.querySelector("#saveSessionBtn");
const loadSessionBtn = document.querySelector("#loadSessionBtn");
const deleteSessionBtn = document.querySelector("#deleteSessionBtn");
const exportSessionBtn = document.querySelector("#exportSessionBtn");
const importSessionBtn = document.querySelector("#importSessionBtn");
const sessionStatus = document.querySelector("#sessionStatus");

const DEFAULT_SESSION_NAME = "Untitled Session";
const DEFAULT_HOOK_START = 60 * 1000;
const DEFAULT_HOOK_LENGTH = 30 * 1000;

let hookDb = {};
let sessionQueue = [];
let savedSessions = {};
let activeSessionName = DEFAULT_SESSION_NAME;
let selectedQueueIndex = null;
let isSessionRunning = false;
let storeSavePromise = Promise.resolve();

function readLocalStorageJson(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
        console.warn(`Could not read ${key} from localStorage:`, error);
        return fallback;
    }
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function secondsToMs(value, fallbackMs) {
    return Math.max(0, toNumber(value, fallbackMs / 1000) * 1000);
}

function normalizeHookEnd(value, start) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > start
        ? parsed
        : start + DEFAULT_HOOK_LENGTH;
}

function formatSeconds(valueMs) {
    return `${Math.round(valueMs / 1000)}s`;
}

function normalizeHookDb(rawHookDb = {}) {
    const normalized = {};

    Object.entries(rawHookDb || {}).forEach(([uri, hook]) => {
        if (!uri) {
            return;
        }

        if (typeof hook === "number") {
            normalized[uri] = {
                start: toNumber(hook),
                end: toNumber(hook) + DEFAULT_HOOK_LENGTH
            };
            return;
        }

        const start = toNumber(hook && hook.start, DEFAULT_HOOK_START);
        const end = normalizeHookEnd(hook && hook.end, start);

        normalized[uri] = { start, end };
    });

    return normalized;
}

function normalizeQueue(queue = []) {
    if (!Array.isArray(queue)) {
        return [];
    }

    return queue
        .filter((track) => track && track.uri)
        .map((track) => {
            const hookStart = toNumber(track.hookStart, DEFAULT_HOOK_START);
            const hookEnd = normalizeHookEnd(track.hookEnd, hookStart);

            return {
                uri: String(track.uri),
                name: String(track.name || "Untitled Track"),
                artist: track.artist ? String(track.artist) : "",
                hookStart,
                hookEnd
            };
        });
}

function normalizeSession(rawSession = {}) {
    rawSession = rawSession || {};

    const now = new Date().toISOString();
    const name = sanitizeSessionName(rawSession.name || DEFAULT_SESSION_NAME);

    return {
        name,
        queue: normalizeQueue(rawSession.queue || rawSession.sessionQueue),
        createdAt: rawSession.createdAt || now,
        updatedAt: rawSession.updatedAt || now
    };
}

function normalizeSessions(rawSessions = {}) {
    const normalized = {};

    Object.entries(rawSessions || {}).forEach(([key, value]) => {
        const session = normalizeSession({
            name: value && value.name ? value.name : key,
            ...value
        });
        normalized[session.name] = session;
    });

    return normalized;
}

function sanitizeSessionName(name) {
    return String(name || DEFAULT_SESSION_NAME).trim() || DEFAULT_SESSION_NAME;
}

function getUniqueSessionName(name) {
    const baseName = sanitizeSessionName(name);
    let candidate = baseName;
    let suffix = 2;

    while (savedSessions[candidate]) {
        candidate = `${baseName} ${suffix}`;
        suffix += 1;
    }

    return candidate;
}

function getCurrentSessionName() {
    return sanitizeSessionName(
        sessionNameInput ? sessionNameInput.value : activeSessionName
    );
}

function setSessionStatus(message, tone = "info") {
    if (!sessionStatus) {
        return;
    }

    sessionStatus.textContent = message;
    sessionStatus.dataset.tone = tone;
}

function getHookForSong(uri) {
    const savedHook = hookDb[uri];

    if (!savedHook) {
        return {
            start: DEFAULT_HOOK_START,
            end: DEFAULT_HOOK_START + DEFAULT_HOOK_LENGTH
        };
    }

    const start = toNumber(savedHook.start, DEFAULT_HOOK_START);
    const end = normalizeHookEnd(savedHook.end, start);

    return { start, end };
}

function updateActiveSessionName(name) {
    activeSessionName = sanitizeSessionName(name);

    if (sessionNameInput && document.activeElement !== sessionNameInput) {
        sessionNameInput.value = activeSessionName;
    }
}

function renderSessionControls() {
    if (sessionNameInput && document.activeElement !== sessionNameInput) {
        sessionNameInput.value = activeSessionName;
    }

    if (!savedSessionSelect) {
        return;
    }

    savedSessionSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Saved sessions";
    savedSessionSelect.appendChild(placeholder);

    Object.keys(savedSessions)
        .sort((a, b) => a.localeCompare(b))
        .forEach((sessionName) => {
            const option = document.createElement("option");
            option.value = sessionName;
            option.textContent = sessionName;
            savedSessionSelect.appendChild(option);
        });

    savedSessionSelect.value = savedSessions[activeSessionName] ? activeSessionName : "";
    savedSessionSelect.disabled = Object.keys(savedSessions).length === 0;
}

async function persistStore() {
    const activeSession = normalizeSession({
        name: activeSessionName,
        queue: sessionQueue,
        updatedAt: new Date().toISOString()
    });

    storeSavePromise = storeSavePromise
        .catch(() => {})
        .then(() => api.saveStore({
            hookDb,
            sessions: savedSessions,
            activeSession
        }));

    try {
        await storeSavePromise;
    } catch (error) {
        console.error("Could not save Rhythm store:", error);
        setSessionStatus("Could not save session data.", "error");
    }
}

async function loadInitialStore() {
    const legacyHookDb = normalizeHookDb(readLocalStorageJson("hookDb", {}));
    const legacyQueue = normalizeQueue(readLocalStorageJson("sessionQueue", []));

    try {
        const store = await api.loadStore();
        const storedQueue = normalizeQueue(store.activeSession && store.activeSession.queue);

        hookDb = {
            ...legacyHookDb,
            ...normalizeHookDb(store.hookDb)
        };
        savedSessions = normalizeSessions(store.sessions);
        updateActiveSessionName(
            store.activeSession && store.activeSession.name
                ? store.activeSession.name
                : DEFAULT_SESSION_NAME
        );
        sessionQueue = storedQueue.length ? storedQueue : legacyQueue;

        if (!sessionQueue.length && savedSessions[activeSessionName]) {
            sessionQueue = normalizeQueue(savedSessions[activeSessionName].queue);
        }

        await persistStore();
        setSessionStatus("Session data ready.");
    } catch (error) {
        console.error("Could not load persistent store:", error);
        hookDb = legacyHookDb;
        sessionQueue = legacyQueue;
        savedSessions = {};
        updateActiveSessionName(DEFAULT_SESSION_NAME);
        setSessionStatus("Using local fallback data.", "warning");
    }

    renderSessionControls();
    renderQueue();
}

function commitHook(song, hookStartInput, hookEndInput) {
    const start = secondsToMs(hookStartInput.value, DEFAULT_HOOK_START);
    const end = normalizeHookEnd(secondsToMs(hookEndInput.value, start + DEFAULT_HOOK_LENGTH), start);

    hookStartInput.value = Math.round(start / 1000);
    hookEndInput.value = Math.round(end / 1000);
    hookDb[song.uri] = { start, end };

    persistStore();
    return hookDb[song.uri];
}

async function loadPlaylist() {
    const playlistId = playlistInput ? playlistInput.value.trim() : "";

    if (!playlistId) {
        setSessionStatus("Enter a playlist ID first.", "warning");
        playlistInput && playlistInput.focus();
        return;
    }

    if (songList) {
        songList.innerHTML = `<li class="empty-state">Loading tracks...</li>`;
    }

    try {
        const data = await api.fetchPlaylist(playlistId);

        if (!data || !Array.isArray(data.items)) {
            throw new Error("Spotify did not return playlist tracks.");
        }

        const songs = data.items
            .filter((entry) => entry && entry.item && entry.item.uri)
            .map((entry) => ({
                name: entry.item.name,
                artist: entry.item.artists && entry.item.artists.length
                    ? entry.item.artists.map((artist) => artist.name).join(", ")
                    : "Unknown Artist",
                uri: entry.item.uri
            }));

        renderSongs(songs);
        setSessionStatus(`${songs.length} tracks loaded.`);
    } catch (error) {
        console.error("Could not load playlist:", error);
        if (songList) {
            songList.innerHTML = `<li class="empty-state">No tracks loaded.</li>`;
        }
        setSessionStatus("Could not load playlist.", "error");
    }
}

function renderSongs(songs) {
    if (!songList) {
        return;
    }

    songList.innerHTML = "";

    if (!songs.length) {
        songList.innerHTML = `<li class="empty-state">No tracks found.</li>`;
        return;
    }

    songs.forEach((song) => {
        const li = document.createElement("li");
        li.className = "track-row";

        const title = document.createElement("span");
        title.className = "track-title";
        title.textContent = `${song.name} - ${song.artist}`;

        const controls = document.createElement("div");
        controls.className = "track-actions";

        const hook = getHookForSong(song.uri);
        const hookStart = document.createElement("input");
        hookStart.type = "number";
        hookStart.min = "0";
        hookStart.placeholder = "Start";
        hookStart.className = "hook-input";
        hookStart.value = Math.round(hook.start / 1000);
        hookStart.setAttribute("aria-label", "Hook start seconds");

        const hookEnd = document.createElement("input");
        hookEnd.type = "number";
        hookEnd.min = "1";
        hookEnd.placeholder = "End";
        hookEnd.className = "hook-input";
        hookEnd.value = Math.round(hook.end / 1000);
        hookEnd.setAttribute("aria-label", "Hook end seconds");

        hookStart.addEventListener("change", () => commitHook(song, hookStart, hookEnd));
        hookEnd.addEventListener("change", () => commitHook(song, hookStart, hookEnd));

        const playBtn = document.createElement("button");
        playBtn.textContent = "Play";
        playBtn.className = "btn-action";
        playBtn.title = "Play this hook";
        playBtn.addEventListener("click", async () => {
            const hookRange = commitHook(song, hookStart, hookEnd);
            await api.playHook(song.uri, hookRange.start);
        });

        const queueBtn = document.createElement("button");
        queueBtn.textContent = "+ Queue";
        queueBtn.className = "btn-action btn-add";
        queueBtn.title = "Add or update this track in the queue";
        queueBtn.addEventListener("click", async () => {
            const hookRange = commitHook(song, hookStart, hookEnd);
            const queuedTrack = {
                uri: song.uri,
                name: song.name,
                artist: song.artist,
                hookStart: hookRange.start,
                hookEnd: hookRange.end
            };
            const existingIndex = sessionQueue.findIndex((track) => track.uri === song.uri);

            if (existingIndex >= 0) {
                sessionQueue[existingIndex] = queuedTrack;
                selectedQueueIndex = existingIndex;
                setSessionStatus("Queued track updated.");
            } else {
                sessionQueue.push(queuedTrack);
                selectedQueueIndex = sessionQueue.length - 1;
                setSessionStatus("Track added to queue.");
            }

            renderQueue();
            await persistStore();
        });

        controls.appendChild(hookStart);
        controls.appendChild(hookEnd);
        controls.appendChild(playBtn);
        controls.appendChild(queueBtn);
        li.appendChild(title);
        li.appendChild(controls);
        songList.appendChild(li);
    });
}

function selectQueueIndex(index) {
    if (!sessionQueue.length) {
        selectedQueueIndex = null;
    } else {
        selectedQueueIndex = Math.min(Math.max(index, 0), sessionQueue.length - 1);
    }

    renderQueue();
}

async function moveQueueItem(index, direction) {
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= sessionQueue.length) {
        return;
    }

    [sessionQueue[index], sessionQueue[nextIndex]] = [sessionQueue[nextIndex], sessionQueue[index]];
    selectedQueueIndex = nextIndex;
    renderQueue();
    await persistStore();
}

async function removeQueueItem(index) {
    if (index < 0 || index >= sessionQueue.length) {
        return;
    }

    sessionQueue.splice(index, 1);
    selectedQueueIndex = sessionQueue.length
        ? Math.min(index, sessionQueue.length - 1)
        : null;
    renderQueue();
    await persistStore();
    setSessionStatus("Track removed.");
}

function syncQueueSelection() {
    if (!queueList) {
        return;
    }

    queueList.querySelectorAll(".queue-row").forEach((row, index) => {
        row.classList.toggle("selected", index === selectedQueueIndex);
    });
}

function renderQueue() {
    if (!queueList) {
        return;
    }

    queueList.innerHTML = "";

    if (!sessionQueue.length) {
        queueList.innerHTML = `<li class="empty-state">No tracks queued.</li>`;
        selectedQueueIndex = null;
        return;
    }

    sessionQueue.forEach((track, index) => {
        const li = document.createElement("li");
        li.className = "queue-row";
        li.tabIndex = 0;

        if (index === selectedQueueIndex) {
            li.classList.add("selected");
        }

        li.addEventListener("click", () => {
            selectedQueueIndex = index;
            syncQueueSelection();
        });
        li.addEventListener("focus", () => {
            selectedQueueIndex = index;
            syncQueueSelection();
        });

        const text = document.createElement("span");
        text.className = "track-title";
        text.textContent = `${track.name} (${formatSeconds(track.hookStart)} - ${formatSeconds(track.hookEnd)})`;

        const actions = document.createElement("div");
        actions.className = "track-actions";

        const playBtn = document.createElement("button");
        playBtn.textContent = "Play";
        playBtn.className = "btn-action";
        playBtn.title = "Play this queued hook";
        playBtn.addEventListener("click", async (event) => {
            event.stopPropagation();
            selectedQueueIndex = index;
            await api.playHook(track.uri, track.hookStart);
            renderQueue();
        });

        const upBtn = document.createElement("button");
        upBtn.textContent = "Up";
        upBtn.className = "btn-action";
        upBtn.title = "Move track up";
        upBtn.disabled = index === 0;
        upBtn.addEventListener("click", async (event) => {
            event.stopPropagation();
            await moveQueueItem(index, -1);
        });

        const downBtn = document.createElement("button");
        downBtn.textContent = "Down";
        downBtn.className = "btn-action";
        downBtn.title = "Move track down";
        downBtn.disabled = index === sessionQueue.length - 1;
        downBtn.addEventListener("click", async (event) => {
            event.stopPropagation();
            await moveQueueItem(index, 1);
        });

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.className = "btn-action btn-danger";
        removeBtn.title = "Remove track";
        removeBtn.addEventListener("click", async (event) => {
            event.stopPropagation();
            await removeQueueItem(index);
        });

        actions.appendChild(playBtn);
        actions.appendChild(upBtn);
        actions.appendChild(downBtn);
        actions.appendChild(removeBtn);
        li.appendChild(text);
        li.appendChild(actions);
        queueList.appendChild(li);
    });
}

async function saveNamedSession() {
    const name = getCurrentSessionName();
    const now = new Date().toISOString();
    const previous = savedSessions[name];

    updateActiveSessionName(name);
    savedSessions[name] = {
        name,
        queue: normalizeQueue(sessionQueue),
        createdAt: previous ? previous.createdAt : now,
        updatedAt: now
    };

    renderSessionControls();
    await persistStore();
    setSessionStatus(`Saved "${name}".`);
}

async function loadSelectedSession() {
    const name = savedSessionSelect ? savedSessionSelect.value : "";
    const session = savedSessions[name];

    if (!session) {
        setSessionStatus("Choose a saved session first.", "warning");
        return;
    }

    updateActiveSessionName(name);
    sessionQueue = normalizeQueue(session.queue);
    selectedQueueIndex = sessionQueue.length ? 0 : null;
    renderSessionControls();
    renderQueue();
    await persistStore();
    setSessionStatus(`Loaded "${name}".`);
}

async function deleteSelectedSession() {
    const name = savedSessionSelect ? savedSessionSelect.value : "";

    if (!name || !savedSessions[name]) {
        setSessionStatus("Choose a saved session first.", "warning");
        return;
    }

    delete savedSessions[name];

    if (activeSessionName === name) {
        updateActiveSessionName(DEFAULT_SESSION_NAME);
    }

    renderSessionControls();
    await persistStore();
    setSessionStatus(`Deleted "${name}".`);
}

async function exportCurrentSession() {
    try {
        const result = await api.exportSession({
            session: {
                name: getCurrentSessionName(),
                queue: normalizeQueue(sessionQueue)
            },
            hookDb
        });

        if (!result || result.canceled) {
            return;
        }

        setSessionStatus("Session exported.");
    } catch (error) {
        console.error("Could not export session:", error);
        setSessionStatus("Could not export session.", "error");
    }
}

async function importSession() {
    try {
        const result = await api.importSession();

        if (!result || result.canceled) {
            return;
        }

        const importedName = getUniqueSessionName(result.session && result.session.name);
        const importedSession = normalizeSession({
            ...result.session,
            name: importedName
        });

        hookDb = {
            ...hookDb,
            ...normalizeHookDb(result.hookDb)
        };
        updateActiveSessionName(importedName);
        sessionQueue = normalizeQueue(importedSession.queue);
        selectedQueueIndex = sessionQueue.length ? 0 : null;
        savedSessions[importedName] = {
            ...importedSession,
            updatedAt: new Date().toISOString()
        };

        renderSessionControls();
        renderQueue();
        await persistStore();
        setSessionStatus(`Imported "${importedName}".`);
    } catch (error) {
        console.error("Could not import session:", error);
        setSessionStatus("Could not import session.", "error");
    }
}

async function startSession() {
    if (isSessionRunning) {
        return;
    }

    if (!sessionQueue.length) {
        setSessionStatus("Queue at least one track first.", "warning");
        return;
    }

    isSessionRunning = true;
    startSessionBtn && (startSessionBtn.disabled = true);
    setSessionStatus("Session running.");

    try {
        for (const track of [...sessionQueue]) {
            setSessionStatus(`Playing ${track.name}.`);
            await api.playHook(track.uri, track.hookStart);

            const duration = Math.max(0, track.hookEnd - track.hookStart);
            if (duration > 0) {
                await new Promise((resolve) => setTimeout(resolve, duration));
            }
        }

        setSessionStatus("Session complete.");
    } catch (error) {
        console.error("Session playback failed:", error);
        setSessionStatus("Session playback stopped.", "error");
    } finally {
        isSessionRunning = false;
        startSessionBtn && (startSessionBtn.disabled = false);
    }
}

function isTypingTarget(target) {
    if (!target) {
        return false;
    }

    const tagName = target.tagName;
    return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(tagName);
}

function handleKeyboardShortcuts(event) {
    const key = event.key.toLowerCase();
    const commandPressed = event.ctrlKey || event.metaKey;

    if (commandPressed && key === "s") {
        event.preventDefault();
        saveNamedSession();
        return;
    }

    if (commandPressed && key === "e") {
        event.preventDefault();
        exportCurrentSession();
        return;
    }

    if (commandPressed && key === "o") {
        event.preventDefault();
        importSession();
        return;
    }

    if (commandPressed && key === "l") {
        event.preventDefault();
        playlistInput && playlistInput.focus();
        return;
    }

    if (commandPressed && event.key === "Enter") {
        event.preventDefault();
        startSession();
        return;
    }

    if (isTypingTarget(event.target)) {
        return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedQueueIndex !== null) {
            event.preventDefault();
            removeQueueItem(selectedQueueIndex);
        }
        return;
    }

    if (event.altKey && event.key === "ArrowUp" && selectedQueueIndex !== null) {
        event.preventDefault();
        moveQueueItem(selectedQueueIndex, -1);
        return;
    }

    if (event.altKey && event.key === "ArrowDown" && selectedQueueIndex !== null) {
        event.preventDefault();
        moveQueueItem(selectedQueueIndex, 1);
        return;
    }

    if (event.key === "ArrowUp" && selectedQueueIndex !== null) {
        event.preventDefault();
        selectQueueIndex(selectedQueueIndex - 1);
        return;
    }

    if (event.key === "ArrowDown" && selectedQueueIndex !== null) {
        event.preventDefault();
        selectQueueIndex(selectedQueueIndex + 1);
        return;
    }

    if (event.key === "Enter" && selectedQueueIndex !== null) {
        event.preventDefault();
        const track = sessionQueue[selectedQueueIndex];
        track && api.playHook(track.uri, track.hookStart);
    }
}

button && button.addEventListener("click", () => {
    status.innerHTML = `<span class="dot" style="background: #ebb11a;"></span> Communicating with API context...`;
    api.loginWithSpotify();
});

playlistBtn && playlistBtn.addEventListener("click", loadPlaylist);
playlistInput && playlistInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        loadPlaylist();
    }
});

saveSessionBtn && saveSessionBtn.addEventListener("click", saveNamedSession);
loadSessionBtn && loadSessionBtn.addEventListener("click", loadSelectedSession);
deleteSessionBtn && deleteSessionBtn.addEventListener("click", deleteSelectedSession);
exportSessionBtn && exportSessionBtn.addEventListener("click", exportCurrentSession);
importSessionBtn && importSessionBtn.addEventListener("click", importSession);
savedSessionSelect && savedSessionSelect.addEventListener("change", loadSelectedSession);
sessionNameInput && sessionNameInput.addEventListener("change", () => {
    updateActiveSessionName(sessionNameInput.value);
    persistStore();
    renderSessionControls();
});
startSessionBtn && startSessionBtn.addEventListener("click", startSession);
document.addEventListener("keydown", handleKeyboardShortcuts);

api.onSpotifyConnected((data) => {
    status.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
            <div><span class="dot pulse-green"></span> Connected to Engine Instance</div>
            <small style="color: #888; font-size: 0.75rem; padding-left: 20px;">Session active</small>
        </div>
    `;
    button.style.display = "none";
});

loadInitialStore();
