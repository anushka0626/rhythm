// renderer.js
const api = window.electronAPI || {
    loginWithSpotify: () => {},
    onSpotifyConnected: () => {},
    fetchPlaylist: async () => ({ items: [] }),
    analyzeTracks: async () => ({ ok: false, features: [] }),
    playHook: async () => {},
    pausePlayback: async () => ({ ok: true }),
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
const pauseSessionBtn = document.querySelector("#pauseSessionBtn");
const stopSessionBtn = document.querySelector("#stopSessionBtn");
const skipTrackBtn = document.querySelector("#skipTrackBtn");
const loopSessionToggle = document.querySelector("#loopSessionToggle");
const currentTrackName = document.querySelector("#currentTrackName");
const playbackTime = document.querySelector("#playbackTime");
const playbackProgress = document.querySelector("#playbackProgress");
const moodPresetSelect = document.querySelector("#moodPresetSelect");
const applyMoodBtn = document.querySelector("#applyMoodBtn");
const analyzeQueueBtn = document.querySelector("#analyzeQueueBtn");
const smartOrderBtn = document.querySelector("#smartOrderBtn");
const templateSelect = document.querySelector("#templateSelect");
const applyTemplateBtn = document.querySelector("#applyTemplateBtn");
const phase2Status = document.querySelector("#phase2Status");
const transitionList = document.querySelector("#transitionList");
const currentOrderList = document.querySelector("#currentOrderList");
const recommendedOrderList = document.querySelector("#recommendedOrderList");
const orderInsight = document.querySelector("#orderInsight");
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
const DEFAULT_MOOD_KEY = "balanced";

const MOOD_PRESETS = {
    balanced: {
        label: "Balanced",
        bpm: 116,
        energy: 0.62,
        danceability: 0.62,
        valence: 0.55,
        ramp: "smooth"
    },
    warmup: {
        label: "Warmup",
        bpm: 104,
        energy: 0.45,
        danceability: 0.55,
        valence: 0.52,
        ramp: "up"
    },
    peak: {
        label: "Peak Night",
        bpm: 124,
        energy: 0.82,
        danceability: 0.78,
        valence: 0.66,
        ramp: "up"
    },
    chill: {
        label: "Chill Flow",
        bpm: 92,
        energy: 0.34,
        danceability: 0.46,
        valence: 0.50,
        ramp: "smooth"
    },
    focus: {
        label: "Focus",
        bpm: 100,
        energy: 0.48,
        danceability: 0.42,
        valence: 0.45,
        ramp: "smooth"
    }
};

const SESSION_TEMPLATES = {
    cleanRamp: {
        label: "Clean Ramp",
        mood: "warmup",
        hookLengthSec: 32,
        order: "ramp"
    },
    peakRun: {
        label: "Peak Run",
        mood: "peak",
        hookLengthSec: 28,
        order: "intensity"
    },
    chillArc: {
        label: "Chill Arc",
        mood: "chill",
        hookLengthSec: 42,
        order: "smooth"
    },
    threeAct: {
        label: "Three-Act Set",
        mood: "balanced",
        hookLengthSec: 36,
        order: "threeAct"
    }
};

const ENERGY_BANDS = {
    high: {
        label: "High Energy",
        min: 0.68
    },
    medium: {
        label: "Medium Energy",
        min: 0.47
    },
    low: {
        label: "Low Energy",
        min: 0
    }
};

const VIBE_HINTS = [
    {
        tag: "festival-edm",
        pattern: /(edm|electro|house|progressive house|big room|festival|david guetta|avicii|martin garrix|levels|titanium|animals)/,
        energy: 0.82,
        danceability: 0.78,
        valence: 0.58,
        bpm: 128,
        band: "high",
        weight: 0.9
    },
    {
        tag: "aggressive-edm",
        pattern: /(animals|big room|brostep|dubstep|trap|bass)/,
        energy: 0.88,
        danceability: 0.74,
        valence: 0.42,
        bpm: 128,
        band: "high",
        weight: 0.85
    },
    {
        tag: "synth-pop",
        pattern: /(synth|new wave|blinding lights|the weeknd|retro pop)/,
        energy: 0.62,
        danceability: 0.72,
        valence: 0.62,
        bpm: 114,
        band: "medium",
        weight: 0.75
    },
    {
        tag: "romantic-ballad",
        pattern: /(ballad|acoustic|soft|piano|love|romantic|perfect|until i found you|singer-songwriter)/,
        energy: 0.28,
        danceability: 0.38,
        valence: 0.50,
        bpm: 96,
        band: "low",
        weight: 0.9
    },
    {
        tag: "emotional-bollywood",
        pattern: /(bollywood|filmi|desi|hindi|arijit|tum hi ho|atif|shreya)/,
        energy: 0.34,
        danceability: 0.42,
        valence: 0.36,
        bpm: 102,
        band: "low",
        weight: 0.9
    },
    {
        tag: "hip-hop",
        pattern: /(hip hop|rap|trap|drill)/,
        energy: 0.58,
        danceability: 0.72,
        valence: 0.48,
        bpm: 96,
        band: "medium",
        weight: 0.55
    }
];

let hookDb = {};
let sessionQueue = [];
let savedSessions = {};
let activeSessionName = DEFAULT_SESSION_NAME;
let activeMoodKey = DEFAULT_MOOD_KEY;
let selectedQueueIndex = null;
let storeSavePromise = Promise.resolve();
const playbackState = {
    running: false,
    paused: false,
    currentIndex: null,
    elapsedMs: 0,
    startedAt: 0,
    timeoutId: null,
    progressIntervalId: null,
    sequence: 0
};

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

function getTrackIdFromUri(uri) {
    const parts = String(uri || "").split(":");
    return parts.length ? parts[parts.length - 1] : "";
}

function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
}

function normalizeAnalysis(rawAnalysis = null) {
    if (!rawAnalysis || typeof rawAnalysis !== "object") {
        return null;
    }

    return {
        source: rawAnalysis.source || "estimated",
        bpm: toNumber(rawAnalysis.bpm || rawAnalysis.tempo),
        energy: clamp(toNumber(rawAnalysis.energy, 0.5)),
        danceability: clamp(toNumber(rawAnalysis.danceability, 0.5)),
        valence: clamp(toNumber(rawAnalysis.valence, 0.5)),
        acousticness: clamp(toNumber(rawAnalysis.acousticness, 0)),
        instrumentalness: clamp(toNumber(rawAnalysis.instrumentalness, 0)),
        loudness: toNumber(rawAnalysis.loudness, -12),
        key: Number.isFinite(Number(rawAnalysis.key)) ? Number(rawAnalysis.key) : -1,
        mode: Number.isFinite(Number(rawAnalysis.mode)) ? Number(rawAnalysis.mode) : 1,
        confidence: clamp(toNumber(rawAnalysis.confidence, rawAnalysis.source === "spotify" ? 1 : 0.35)),
        vibeBand: rawAnalysis.vibeBand || "",
        vibeTags: Array.isArray(rawAnalysis.vibeTags) ? rawAnalysis.vibeTags : []
    };
}

function getTrackVibeText(track) {
    return [
        track.name,
        track.artist,
        track.albumName,
        Array.isArray(track.genres) ? track.genres.join(" ") : ""
    ].filter(Boolean).join(" ").toLowerCase();
}

function getVibeHints(track) {
    const text = getTrackVibeText(track);
    return VIBE_HINTS.filter((hint) => hint.pattern.test(text));
}

function blendToward(value, target, weight) {
    return value * (1 - weight) + target * weight;
}

function getEnergyBand(analysis) {
    if (analysis.vibeBand && ENERGY_BANDS[analysis.vibeBand]) {
        return analysis.vibeBand;
    }

    if (analysis.energy >= ENERGY_BANDS.high.min) {
        return "high";
    }

    if (analysis.energy >= ENERGY_BANDS.medium.min) {
        return "medium";
    }

    return "low";
}

function estimateAnalysis(track) {
    const hookLength = Math.max(1, (track.hookEnd - track.hookStart) / 1000);
    const popularityScore = clamp(toNumber(track.popularity, 50) / 100);
    const durationScore = clamp(toNumber(track.durationMs, 210000) / 300000);
    const hookScore = clamp(1 - Math.abs(hookLength - 32) / 60);
    const hints = getVibeHints(track);
    let energy = clamp(0.40 + popularityScore * 0.12 + hookScore * 0.12);
    let danceability = clamp(0.46 + hookScore * 0.16);
    let valence = clamp(0.45 + popularityScore * 0.10);
    let bpm = Math.round(86 + energy * 38 + danceability * 14 + durationScore * 8);
    let vibeBand = "";

    hints.forEach((hint) => {
        energy = clamp(blendToward(energy, hint.energy, hint.weight));
        danceability = clamp(blendToward(danceability, hint.danceability, hint.weight));
        valence = clamp(blendToward(valence, hint.valence, hint.weight));
        bpm = Math.round(blendToward(bpm, hint.bpm, hint.weight));
        vibeBand = hint.band || vibeBand;
    });

    const analysis = {
        source: "estimated",
        bpm,
        energy,
        danceability,
        valence,
        acousticness: hints.some((hint) => hint.band === "low") ? 0.62 : 0.18,
        instrumentalness: 0.08,
        loudness: -16 + energy * 11,
        key: -1,
        mode: valence >= 0.5 ? 1 : 0,
        confidence: hints.length ? 0.58 : 0.32,
        vibeBand,
        vibeTags: hints.map((hint) => hint.tag)
    };

    analysis.vibeBand = getEnergyBand(analysis);
    return analysis;
}

function getTrackAnalysis(track) {
    const base = normalizeAnalysis(track.analysis) || estimateAnalysis(track);
    const hints = getVibeHints(track);
    const enriched = {
        ...base,
        vibeTags: [...new Set([...(base.vibeTags || []), ...hints.map((hint) => hint.tag)])]
    };

    hints.forEach((hint) => {
        const weight = base.source === "spotify" ? hint.weight * 0.35 : hint.weight * 0.75;
        enriched.energy = clamp(blendToward(enriched.energy, hint.energy, weight));
        enriched.danceability = clamp(blendToward(enriched.danceability, hint.danceability, weight));
        enriched.valence = clamp(blendToward(enriched.valence, hint.valence, weight));
        enriched.bpm = Math.round(blendToward(enriched.bpm, hint.bpm, weight * 0.45));

        if (!enriched.vibeBand || weight > 0.4) {
            enriched.vibeBand = hint.band || enriched.vibeBand;
        }
    });

    enriched.vibeBand = getEnergyBand(enriched);
    return enriched;
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
                id: track.id ? String(track.id) : getTrackIdFromUri(track.uri),
                uri: String(track.uri),
                name: String(track.name || "Untitled Track"),
                artist: track.artist ? String(track.artist) : "",
                artistIds: Array.isArray(track.artistIds) ? track.artistIds.map(String) : [],
                genres: Array.isArray(track.genres) ? track.genres.map(String) : [],
                albumName: track.albumName ? String(track.albumName) : "",
                releaseDate: track.releaseDate ? String(track.releaseDate) : "",
                durationMs: toNumber(track.durationMs),
                popularity: toNumber(track.popularity),
                hookStart,
                hookEnd,
                analysis: normalizeAnalysis(track.analysis),
                transition: track.transition && typeof track.transition === "object"
                    ? track.transition
                    : null
            };
        });
}

function normalizeSession(rawSession = {}) {
    rawSession = rawSession || {};

    const now = new Date().toISOString();
    const name = sanitizeSessionName(rawSession.name || DEFAULT_SESSION_NAME);

    return {
        name,
        moodKey: rawSession.moodKey ? String(rawSession.moodKey) : DEFAULT_MOOD_KEY,
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

function getHookForSong(uri, track = null) {
    const savedHook = hookDb[uri];

    if (!savedHook) {
        return track
            ? getRecommendedHookWindow(track)
            : {
                start: DEFAULT_HOOK_START,
                end: DEFAULT_HOOK_START + DEFAULT_HOOK_LENGTH
            };
    }

    const start = toNumber(savedHook.start, DEFAULT_HOOK_START);
    const end = normalizeHookEnd(savedHook.end, start);

    return { start, end };
}

function getRecommendedHookWindow(track, preferredLengthMs = null) {
    const hints = getVibeHints(track);
    const tags = hints.map((hint) => hint.tag);
    let start = 60 * 1000;
    let length = preferredLengthMs || 30 * 1000;

    if (tags.includes("aggressive-edm") || tags.includes("festival-edm")) {
        start = 55 * 1000;
        length = preferredLengthMs || 22 * 1000;
    } else if (tags.includes("synth-pop")) {
        start = 45 * 1000;
        length = preferredLengthMs || 30 * 1000;
    } else if (tags.includes("romantic-ballad")) {
        start = 80 * 1000;
        length = preferredLengthMs || 32 * 1000;
    } else if (tags.includes("emotional-bollywood")) {
        start = 75 * 1000;
        length = preferredLengthMs || 35 * 1000;
    }

    const durationMs = toNumber(track.durationMs, 0);

    if (durationMs > 0 && start + length > durationMs - 5000) {
        start = Math.max(0, durationMs - length - 5000);
    }

    return {
        start,
        end: start + length
    };
}

function hasDefaultHookWindow(track) {
    return Math.abs(track.hookStart - DEFAULT_HOOK_START) < 1000
        && Math.abs(track.hookEnd - (DEFAULT_HOOK_START + DEFAULT_HOOK_LENGTH)) < 1000;
}

function applyRecommendedHookWindows(preferredLengthMs = null) {
    sessionQueue = sessionQueue.map((track) => {
        if (!hasDefaultHookWindow(track)) {
            return track;
        }

        const hook = getRecommendedHookWindow(track, preferredLengthMs);

        return {
            ...track,
            hookStart: hook.start,
            hookEnd: hook.end
        };
    });
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

function setPhase2Status(message, tone = "info") {
    if (!phase2Status) {
        return;
    }

    phase2Status.textContent = message;
    phase2Status.dataset.tone = tone;
}

function getMoodPreset(key = activeMoodKey) {
    return MOOD_PRESETS[key] || MOOD_PRESETS[DEFAULT_MOOD_KEY];
}

function renderPhase2Controls() {
    if (moodPresetSelect) {
        moodPresetSelect.innerHTML = "";

        Object.entries(MOOD_PRESETS).forEach(([key, preset]) => {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = preset.label;
            moodPresetSelect.appendChild(option);
        });

        moodPresetSelect.value = MOOD_PRESETS[activeMoodKey] ? activeMoodKey : DEFAULT_MOOD_KEY;
    }

    if (templateSelect) {
        templateSelect.innerHTML = "";

        Object.entries(SESSION_TEMPLATES).forEach(([key, template]) => {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = template.label;
            templateSelect.appendChild(option);
        });
    }

    if (analyzeQueueBtn) {
        analyzeQueueBtn.disabled = sessionQueue.length === 0;
    }

    if (smartOrderBtn) {
        smartOrderBtn.disabled = sessionQueue.length < 2;
    }

    if (applyTemplateBtn) {
        applyTemplateBtn.disabled = sessionQueue.length === 0;
    }
}

function setActiveMood(key) {
    activeMoodKey = MOOD_PRESETS[key] ? key : DEFAULT_MOOD_KEY;
    renderPhase2Controls();
    renderTransitionSuggestions();
}

function scoreTrackForMood(track, preset = getMoodPreset()) {
    const analysis = getTrackAnalysis(track);
    const popularityScore = clamp(toNumber(track.popularity, 50) / 100);
    const vibeScore = getVibeScore(track);
    const energyScore = 1 - Math.abs(analysis.energy - preset.energy);
    const danceScore = 1 - Math.abs(analysis.danceability - preset.danceability);
    const valenceScore = 1 - Math.abs(analysis.valence - preset.valence);

    return clamp(
        vibeScore * 0.42
            + energyScore * 0.25
            + danceScore * 0.16
            + valenceScore * 0.12
            + popularityScore * 0.05
    );
}

function getVibeScore(track) {
    const analysis = getTrackAnalysis(track);
    const popularityScore = clamp(toNumber(track.popularity, 50) / 100);

    return clamp(
        analysis.energy * 0.5
            + analysis.danceability * 0.3
            + popularityScore * 0.2
    );
}

function getBandRank(track) {
    const band = getEnergyBand(getTrackAnalysis(track));
    return { low: 0, medium: 1, high: 2 }[band] || 1;
}

function getPrimaryVibeTag(track) {
    const tags = getTrackAnalysis(track).vibeTags || [];
    return tags[0] || "general";
}

function getVibeFamily(track) {
    const tags = getTrackAnalysis(track).vibeTags || [];

    if (tags.includes("festival-edm") || tags.includes("aggressive-edm")) {
        return "club";
    }

    if (tags.includes("synth-pop") || tags.includes("hip-hop")) {
        return "pop";
    }

    if (tags.includes("romantic-ballad")) {
        return "romantic";
    }

    if (tags.includes("emotional-bollywood")) {
        return "emotional";
    }

    return "general";
}

function getVibeFamilyRank(track) {
    const band = getEnergyBand(getTrackAnalysis(track));
    const family = getVibeFamily(track);

    if (band === "high") {
        return { club: 0, pop: 1, general: 2, romantic: 3, emotional: 4 }[family] ?? 2;
    }

    if (band === "medium") {
        return { pop: 0, club: 1, general: 2, romantic: 3, emotional: 4 }[family] ?? 2;
    }

    return { romantic: 0, emotional: 1, pop: 2, general: 3, club: 4 }[family] ?? 3;
}

function getKeyCompatibility(a, b) {
    const aAnalysis = getTrackAnalysis(a);
    const bAnalysis = getTrackAnalysis(b);

    if (aAnalysis.key < 0 || bAnalysis.key < 0) {
        return 0.5;
    }

    const keyDistance = Math.min(
        Math.abs(aAnalysis.key - bAnalysis.key),
        12 - Math.abs(aAnalysis.key - bAnalysis.key)
    );

    if (keyDistance === 0 && aAnalysis.mode === bAnalysis.mode) {
        return 1;
    }

    if (keyDistance === 0 || keyDistance === 5 || keyDistance === 7) {
        return 0.82;
    }

    if (keyDistance <= 2) {
        return 0.62;
    }

    return 0.35;
}

function getTransitionScore(a, b) {
    const aAnalysis = getTrackAnalysis(a);
    const bAnalysis = getTrackAnalysis(b);
    const bpmScore = 1 - clamp(Math.abs(aAnalysis.bpm - bAnalysis.bpm) / 70);
    const energyScore = 1 - Math.abs(aAnalysis.energy - bAnalysis.energy);
    const valenceScore = 1 - Math.abs(aAnalysis.valence - bAnalysis.valence);
    const bandScore = 1 - Math.abs(getBandRank(a) - getBandRank(b)) / 2;
    const aTags = new Set(aAnalysis.vibeTags || []);
    const bTags = new Set(bAnalysis.vibeTags || []);
    const sharedTags = [...aTags].filter((tag) => bTags.has(tag)).length;
    const tagScore = sharedTags
        ? 1
        : getVibeFamily(a) === getVibeFamily(b)
            ? 0.72
            : 0.35;
    const keyScore = getKeyCompatibility(a, b);

    return clamp(
        energyScore * 0.32
            + valenceScore * 0.22
            + tagScore * 0.20
            + bandScore * 0.16
            + bpmScore * 0.06
            + keyScore * 0.04
    );
}

function getTransitionSuggestion(a, b) {
    const aAnalysis = getTrackAnalysis(a);
    const bAnalysis = getTrackAnalysis(b);
    const bpmDiff = Math.abs(aAnalysis.bpm - bAnalysis.bpm);
    const energyDiff = bAnalysis.energy - aAnalysis.energy;
    const score = getTransitionScore(a, b);
    let move = "Smooth blend";

    if (bpmDiff > 18) {
        move = "Quick cut";
    } else if (energyDiff > 0.18) {
        move = "Energy lift";
    } else if (energyDiff < -0.18) {
        move = "Cool-down blend";
    }

    const duration = bpmDiff <= 8 && Math.abs(energyDiff) <= 0.14
        ? "8-12s"
        : energyDiff > 0.18
            ? "4-6s"
            : "6-9s";
    const reason = [
        `${ENERGY_BANDS[getEnergyBand(aAnalysis)].label} to ${ENERGY_BANDS[getEnergyBand(bAnalysis)].label}`,
        `${getVibeFamily(a)} to ${getVibeFamily(b)}`,
        `BPM ${Math.round(aAnalysis.bpm)} to ${Math.round(bAnalysis.bpm)}`,
        `energy ${Math.round(aAnalysis.energy * 100)}% to ${Math.round(bAnalysis.energy * 100)}%`,
        aAnalysis.key >= 0 && bAnalysis.key >= 0
            ? `key fit ${Math.round(getKeyCompatibility(a, b) * 100)}%`
            : "key unknown"
    ].join(", ");

    return {
        score,
        move,
        duration,
        reason
    };
}

function renderTransitionSuggestions() {
    if (!transitionList) {
        return;
    }

    transitionList.innerHTML = "";

    if (sessionQueue.length < 2) {
        transitionList.innerHTML = `<li class="empty-state">Queue at least two tracks for transition notes.</li>`;
        return;
    }

    sessionQueue.slice(0, -1).forEach((track, index) => {
        const nextTrack = sessionQueue[index + 1];
        const suggestion = getTransitionSuggestion(track, nextTrack);
        const li = document.createElement("li");
        li.className = "transition-row";

        const title = document.createElement("span");
        title.className = "transition-title";
        title.textContent = `${track.name} -> ${nextTrack.name}`;

        const detail = document.createElement("span");
        detail.className = "transition-detail";
        detail.textContent = `${suggestion.move} (${suggestion.duration}) - fit ${Math.round(suggestion.score * 100)}%; ${suggestion.reason}`;

        li.appendChild(title);
        li.appendChild(detail);
        transitionList.appendChild(li);
    });
}

function renderOrderComparison() {
    if (!currentOrderList || !recommendedOrderList) {
        return;
    }

    currentOrderList.innerHTML = "";
    recommendedOrderList.innerHTML = "";

    if (!sessionQueue.length) {
        currentOrderList.innerHTML = `<li class="empty-state">No tracks queued.</li>`;
        recommendedOrderList.innerHTML = `<li class="empty-state">No recommendation yet.</li>`;
        if (orderInsight) {
            orderInsight.textContent = "Queue tracks to compare ordering.";
        }
        return;
    }

    const recommendedQueue = orderTracksForMood(sessionQueue, getMoodPreset().ramp || "smooth");
    const currentScore = scoreQueueFlow(sessionQueue);
    const recommendedScore = scoreQueueFlow(recommendedQueue);

    renderOrderList(currentOrderList, sessionQueue, { removable: true });
    renderOrderList(recommendedOrderList, recommendedQueue);

    if (orderInsight) {
        const delta = Math.round((recommendedScore - currentScore) * 100);
        orderInsight.textContent = delta > 2
            ? `Recommended order improves vibe flow by ${delta} points.`
            : "Recommended order is close to the current flow.";
    }
}

function renderOrderList(list, tracks, options = {}) {
    tracks.forEach((track, index) => {
        const analysis = getTrackAnalysis(track);
        const li = document.createElement("li");
        const info = document.createElement("div");
        const title = document.createElement("span");
        const meta = document.createElement("span");

        info.className = "order-info";
        title.className = "order-title";
        title.textContent = `${index + 1}. ${track.name}`;
        meta.className = "order-meta";
        meta.textContent = `${ENERGY_BANDS[getEnergyBand(analysis)].label} | ${getVibeFamily(track)} | vibe ${Math.round(getVibeScore(track) * 100)}`;

        info.appendChild(title);
        info.appendChild(meta);
        li.appendChild(info);

        if (options.removable) {
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "X";
            removeBtn.className = "btn-action btn-danger btn-remove order-remove";
            removeBtn.title = "Remove from queue";
            removeBtn.setAttribute("aria-label", `Remove ${track.name}`);
            removeBtn.addEventListener("click", async (event) => {
                event.stopPropagation();
                await removeQueueItem(index);
            });
            li.appendChild(removeBtn);
        }

        list.appendChild(li);
    });
}

function scoreQueueFlow(queue) {
    if (queue.length < 2) {
        return queue.length ? scoreTrackForMood(queue[0]) : 0;
    }

    const transitionAverage = queue.slice(0, -1).reduce((sum, track, index) => (
        sum + getTransitionScore(track, queue[index + 1])
    ), 0) / (queue.length - 1);
    const vibeAverage = queue.reduce((sum, track) => sum + getVibeScore(track), 0) / queue.length;
    const bandPenalty = queue.slice(0, -1).reduce((sum, track, index) => (
        sum + Math.abs(getBandRank(track) - getBandRank(queue[index + 1]))
    ), 0) / (queue.length - 1);

    return clamp(transitionAverage * 0.5 + vibeAverage * 0.35 - bandPenalty * 0.15);
}

function orderTracksForMood(queue, orderMode = "smooth") {
    const tracks = normalizeQueue(queue);
    const preset = getMoodPreset();

    if (tracks.length < 2) {
        return tracks;
    }

    if (orderMode === "threeAct") {
        const sorted = orderTracksForMood(tracks, "ramp");
        const third = Math.max(1, Math.floor(sorted.length / 3));
        const opening = sorted.slice(0, third);
        const close = sorted.slice(third, third * 2);
        const peak = sorted.slice(third * 2);
        return [...opening, ...peak, ...close.reverse()];
    }

    const bandSequence = getBandSequence(orderMode, activeMoodKey);
    const tracksByBand = bandSequence.map((band) => ({
        band,
        tracks: tracks.filter((track) => getEnergyBand(getTrackAnalysis(track)) === band)
    }));

    const missingBands = tracks.filter((track) =>
        !bandSequence.includes(getEnergyBand(getTrackAnalysis(track)))
    );

    return [
        ...tracksByBand.flatMap(({ tracks: bandTracks }) =>
            sequenceVibeCluster(bandTracks, preset, orderMode)
        ),
        ...sequenceVibeCluster(missingBands, preset, orderMode)
    ];
}

function getBandSequence(orderMode, moodKey) {
    if (orderMode === "ramp" || moodKey === "warmup" || moodKey === "chill" || moodKey === "focus") {
        return ["low", "medium", "high"];
    }

    if (orderMode === "intensity" || moodKey === "peak") {
        return ["medium", "high", "low"];
    }

    return ["medium", "high", "low"];
}

function sequenceVibeCluster(tracks, preset, orderMode) {
    if (tracks.length < 2) {
        return tracks;
    }

    const familySorted = [...tracks].sort((a, b) => {
        const familyDiff = getVibeFamilyRank(a) - getVibeFamilyRank(b);

        if (familyDiff !== 0) {
            return familyDiff;
        }

        const aAnalysis = getTrackAnalysis(a);
        const bAnalysis = getTrackAnalysis(b);

        if (orderMode === "ramp") {
            return aAnalysis.energy - bAnalysis.energy;
        }

        if (orderMode === "intensity") {
            return bAnalysis.energy - aAnalysis.energy;
        }

        return scoreTrackForMood(b, preset) - scoreTrackForMood(a, preset);
    });

    const ordered = [];
    const remaining = [...familySorted];

    ordered.push(remaining.shift());

    while (remaining.length) {
        const current = ordered[ordered.length - 1];
        const currentFamily = getVibeFamily(current);
        const candidates = remaining.filter((track) => getVibeFamily(track) === currentFamily);
        const pool = candidates.length ? candidates : remaining;
        const next = pool
            .map((track) => ({
                track,
                score: getTransitionScore(current, track) * 0.58
                    + scoreTrackForMood(track, preset) * 0.27
                    + getVibeScore(track) * 0.15
            }))
            .sort((a, b) => b.score - a.score)[0].track;

        ordered.push(next);
        remaining.splice(remaining.indexOf(next), 1);
    }

    return ordered;
}

function applyHookLengthToQueue(lengthSec) {
    const lengthMs = Math.max(10, toNumber(lengthSec, 32)) * 1000;

    sessionQueue = sessionQueue.map((track) => ({
        ...track,
        ...(hasDefaultHookWindow(track)
            ? {
                hookStart: getRecommendedHookWindow(track, lengthMs).start,
                hookEnd: getRecommendedHookWindow(track, lengthMs).end
            }
            : {
                hookEnd: track.hookStart + lengthMs
            })
    }));
}

async function persistStore() {
    const activeSession = normalizeSession({
        name: activeSessionName,
        moodKey: activeMoodKey,
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
        activeMoodKey = store.activeSession && store.activeSession.moodKey
            ? store.activeSession.moodKey
            : DEFAULT_MOOD_KEY;
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
    renderPhase2Controls();
    renderQueue();
    updatePlaybackControls();
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
                id: entry.item.id || getTrackIdFromUri(entry.item.uri),
                name: entry.item.name,
                artist: entry.item.artists && entry.item.artists.length
                    ? entry.item.artists.map((artist) => artist.name).join(", ")
                    : "Unknown Artist",
                artistIds: entry.item.artists && entry.item.artists.length
                    ? entry.item.artists.map((artist) => artist.id).filter(Boolean)
                    : [],
                uri: entry.item.uri,
                albumName: entry.item.album ? entry.item.album.name : "",
                releaseDate: entry.item.album ? entry.item.album.release_date : "",
                durationMs: entry.item.duration_ms,
                popularity: entry.item.popularity
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

        const hook = getHookForSong(song.uri, song);
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
                id: song.id,
                uri: song.uri,
                name: song.name,
                artist: song.artist,
                artistIds: song.artistIds,
                genres: song.genres || [],
                albumName: song.albumName,
                releaseDate: song.releaseDate,
                durationMs: song.durationMs,
                popularity: song.popularity,
                analysis: normalizeAnalysis(song.analysis),
                hookStart: hookRange.start,
                hookEnd: hookRange.end
            };
            const existingIndex = sessionQueue.findIndex((track) => track.uri === song.uri);

            if (existingIndex >= 0) {
                sessionQueue[existingIndex] = {
                    ...sessionQueue[existingIndex],
                    ...queuedTrack,
                    analysis: queuedTrack.analysis || sessionQueue[existingIndex].analysis
                };
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

    if (playbackState.currentIndex === index) {
        playbackState.currentIndex = nextIndex;
    } else if (playbackState.currentIndex === nextIndex) {
        playbackState.currentIndex = index;
    }

    selectedQueueIndex = nextIndex;
    renderQueue();
    updatePlaybackControls();
    await persistStore();
}

async function removeQueueItem(index) {
    if (index < 0 || index >= sessionQueue.length) {
        return;
    }

    if (playbackState.running && index === playbackState.currentIndex) {
        setSessionStatus("Stop or skip before removing the active track.", "warning");
        return;
    }

    sessionQueue.splice(index, 1);

    if (playbackState.currentIndex !== null && index < playbackState.currentIndex) {
        playbackState.currentIndex -= 1;
    }

    selectedQueueIndex = sessionQueue.length
        ? Math.min(index, sessionQueue.length - 1)
        : null;
    renderQueue();
    updatePlaybackControls();
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

function getTrackDuration(track) {
    return track ? Math.max(0, track.hookEnd - track.hookStart) : 0;
}

function getCurrentTrack() {
    return playbackState.currentIndex === null
        ? null
        : sessionQueue[playbackState.currentIndex];
}

function getPlaybackElapsed() {
    const track = getCurrentTrack();
    const duration = getTrackDuration(track);
    const elapsed = playbackState.paused || !playbackState.running
        ? playbackState.elapsedMs
        : playbackState.elapsedMs + (Date.now() - playbackState.startedAt);

    return Math.min(Math.max(0, elapsed), duration);
}

function clearPlaybackTimers() {
    if (playbackState.timeoutId) {
        clearTimeout(playbackState.timeoutId);
        playbackState.timeoutId = null;
    }

    if (playbackState.progressIntervalId) {
        clearInterval(playbackState.progressIntervalId);
        playbackState.progressIntervalId = null;
    }
}

function hasNextTrack() {
    if (playbackState.currentIndex === null) {
        return false;
    }

    return playbackState.currentIndex < sessionQueue.length - 1
        || Boolean(loopSessionToggle && loopSessionToggle.checked);
}

function updatePlaybackProgress() {
    const track = getCurrentTrack();
    const duration = getTrackDuration(track);
    const elapsed = getPlaybackElapsed();
    const progressPercent = duration ? Math.min(100, (elapsed / duration) * 100) : 0;

    if (playbackProgress) {
        playbackProgress.style.width = `${progressPercent}%`;
    }

    if (playbackTime) {
        playbackTime.textContent = `${formatSeconds(elapsed)} / ${formatSeconds(duration)}`;
    }

    if (currentTrackName) {
        currentTrackName.textContent = track ? track.name : "No active track";
    }
}

function updatePlaybackControls() {
    const running = playbackState.running;
    const paused = playbackState.paused;

    if (startSessionBtn) {
        startSessionBtn.disabled = running;
    }

    if (pauseSessionBtn) {
        pauseSessionBtn.disabled = !running;
        pauseSessionBtn.textContent = paused ? "Resume" : "Pause";
    }

    if (stopSessionBtn) {
        stopSessionBtn.disabled = !running;
    }

    if (skipTrackBtn) {
        skipTrackBtn.disabled = !running || !hasNextTrack();
    }

    updatePlaybackProgress();
}

function renderQueue() {
    if (!queueList) {
        return;
    }

    queueList.innerHTML = "";

    if (!sessionQueue.length) {
        queueList.innerHTML = `<li class="empty-state">No tracks queued.</li>`;
        selectedQueueIndex = null;
        renderPhase2Controls();
        renderTransitionSuggestions();
        renderOrderComparison();
        return;
    }

    sessionQueue.forEach((track, index) => {
        const li = document.createElement("li");
        li.className = "queue-row";
        li.tabIndex = 0;

        if (index === selectedQueueIndex) {
            li.classList.add("selected");
        }

        if (playbackState.running && index === playbackState.currentIndex) {
            li.classList.add(playbackState.paused ? "paused" : "playing");
        }

        li.addEventListener("click", () => {
            selectedQueueIndex = index;
            syncQueueSelection();
        });
        li.addEventListener("focus", () => {
            selectedQueueIndex = index;
            syncQueueSelection();
        });

        const analysis = getTrackAnalysis(track);
        const moodFit = scoreTrackForMood(track);
        const info = document.createElement("div");
        info.className = "track-info";

        const text = document.createElement("span");
        text.className = "track-title";
        text.textContent = `${track.name} (${formatSeconds(track.hookStart)} - ${formatSeconds(track.hookEnd)})`;

        const detail = document.createElement("span");
        detail.className = "track-detail";
        detail.textContent = `${ENERGY_BANDS[getEnergyBand(analysis)].label} | ${getVibeFamily(track)} | Vibe ${Math.round(getVibeScore(track) * 100)} | BPM ${Math.round(analysis.bpm)} | Mood fit ${Math.round(moodFit * 100)}% | ${analysis.source}`;

        info.appendChild(text);
        info.appendChild(detail);

        const actions = document.createElement("div");
        actions.className = "track-actions queue-actions";

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
        removeBtn.textContent = "X";
        removeBtn.className = "btn-action btn-danger btn-remove";
        removeBtn.title = "Remove track";
        removeBtn.setAttribute("aria-label", `Remove ${track.name}`);
        removeBtn.addEventListener("click", async (event) => {
            event.stopPropagation();
            await removeQueueItem(index);
        });

        actions.appendChild(playBtn);
        actions.appendChild(upBtn);
        actions.appendChild(downBtn);
        actions.appendChild(removeBtn);
        li.appendChild(info);
        li.appendChild(actions);
        queueList.appendChild(li);
    });

    renderPhase2Controls();
    renderTransitionSuggestions();
    renderOrderComparison();
}

async function saveNamedSession() {
    const name = getCurrentSessionName();
    const now = new Date().toISOString();
    const previous = savedSessions[name];

    updateActiveSessionName(name);
        savedSessions[name] = {
            name,
            moodKey: activeMoodKey,
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

    if (playbackState.running) {
        await stopSession({ silent: true });
    }

    updateActiveSessionName(name);
    activeMoodKey = session.moodKey || DEFAULT_MOOD_KEY;
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

async function analyzeQueue() {
    if (!sessionQueue.length) {
        setPhase2Status("Queue tracks before analysis.", "warning");
        return;
    }

    const trackIds = sessionQueue
        .map((track) => track.id || getTrackIdFromUri(track.uri))
        .filter(Boolean);
    const artistIds = sessionQueue
        .flatMap((track) => Array.isArray(track.artistIds) ? track.artistIds : [])
        .filter(Boolean);

    setPhase2Status("Analyzing queue...");

    try {
        const result = trackIds.length || artistIds.length
            ? await api.analyzeTracks({ trackIds, artistIds })
            : { ok: false, features: [] };
        const featuresById = new Map(
            (result.features || [])
                .filter(Boolean)
                .map((feature) => [feature.id, feature])
        );
        const artistsById = new Map(
            (result.artists || [])
                .filter(Boolean)
                .map((artist) => [artist.id, artist])
        );

        sessionQueue = sessionQueue.map((track) => {
            const feature = featuresById.get(track.id || getTrackIdFromUri(track.uri));
            const genres = [
                ...new Set([
                    ...(Array.isArray(track.genres) ? track.genres : []),
                    ...(Array.isArray(track.artistIds) ? track.artistIds : [])
                        .flatMap((artistId) => {
                            const artist = artistsById.get(artistId);
                            return artist && Array.isArray(artist.genres) ? artist.genres : [];
                        })
                ])
            ];
            return {
                ...track,
                genres,
                analysis: feature
                    ? normalizeAnalysis({
                        ...feature,
                        source: "spotify",
                        bpm: feature.tempo,
                        confidence: 1
                    })
                    : estimateAnalysis(track)
            };
        });
        applyRecommendedHookWindows();

        renderQueue();
        await persistStore();

        if (result.ok) {
            setPhase2Status("Spotify analysis applied.");
        } else {
            setPhase2Status("Spotify analysis unavailable; using estimates.", "warning");
        }
    } catch (error) {
        console.error("Could not analyze queue:", error);
        sessionQueue = sessionQueue.map((track) => ({
            ...track,
            analysis: normalizeAnalysis(track.analysis) || estimateAnalysis(track)
        }));
        renderQueue();
        await persistStore();
        setPhase2Status("Using estimated analysis.", "warning");
    }
}

async function applyMoodPreset() {
    const moodKey = moodPresetSelect ? moodPresetSelect.value : DEFAULT_MOOD_KEY;
    setActiveMood(moodKey);
    renderQueue();
    await persistStore();
    setPhase2Status(`${getMoodPreset().label} mood active.`);
}

async function applySmartOrdering(orderMode = null) {
    if (sessionQueue.length < 2) {
        setPhase2Status("Queue at least two tracks first.", "warning");
        return;
    }

    if (playbackState.running) {
        await stopSession({ silent: true });
    }

    const preset = getMoodPreset();
    sessionQueue = orderTracksForMood(sessionQueue, orderMode || preset.ramp || "smooth");
    selectedQueueIndex = 0;
    renderQueue();
    await persistStore();
    setPhase2Status("Smart queue order applied.");
}

async function applySessionTemplate() {
    if (!sessionQueue.length) {
        setPhase2Status("Queue tracks before applying a template.", "warning");
        return;
    }

    const templateKey = templateSelect ? templateSelect.value : "cleanRamp";
    const template = SESSION_TEMPLATES[templateKey] || SESSION_TEMPLATES.cleanRamp;

    if (playbackState.running) {
        await stopSession({ silent: true });
    }

    setActiveMood(template.mood);
    applyHookLengthToQueue(template.hookLengthSec);
    sessionQueue = orderTracksForMood(sessionQueue, template.order);
    selectedQueueIndex = 0;
    renderQueue();
    await persistStore();
    setPhase2Status(`${template.label} template applied.`);
}

async function exportCurrentSession() {
    try {
        const result = await api.exportSession({
            session: {
                name: getCurrentSessionName(),
                moodKey: activeMoodKey,
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

        if (playbackState.running) {
            await stopSession({ silent: true });
        }

        hookDb = {
            ...hookDb,
            ...normalizeHookDb(result.hookDb)
        };
        updateActiveSessionName(importedName);
        activeMoodKey = importedSession.moodKey || DEFAULT_MOOD_KEY;
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

async function playCurrentTrack(offsetMs = 0) {
    const track = getCurrentTrack();

    if (!track) {
        await finishSession();
        return;
    }

    const duration = getTrackDuration(track);
    const safeOffset = Math.min(Math.max(0, offsetMs), duration);
    const remaining = Math.max(0, duration - safeOffset);

    playbackState.sequence += 1;
    const sequence = playbackState.sequence;

    clearPlaybackTimers();
    playbackState.paused = false;
    playbackState.elapsedMs = safeOffset;
    playbackState.startedAt = Date.now();
    selectedQueueIndex = playbackState.currentIndex;

    renderQueue();
    updatePlaybackControls();
    setSessionStatus(`Playing ${track.name}.`);

    const result = await api.playHook(track.uri, track.hookStart + safeOffset);

    if (result && result.ok === false) {
        throw new Error(result.error || "Spotify rejected playback.");
    }

    if (sequence !== playbackState.sequence || !playbackState.running || playbackState.paused) {
        return;
    }

    playbackState.timeoutId = setTimeout(() => {
        advancePlayback();
    }, remaining);
    playbackState.progressIntervalId = setInterval(updatePlaybackProgress, 250);
    updatePlaybackControls();
}

async function startSession() {
    if (playbackState.running) {
        return;
    }

    if (!sessionQueue.length) {
        setSessionStatus("Queue at least one track first.", "warning");
        return;
    }

    playbackState.running = true;
    playbackState.paused = false;
    playbackState.currentIndex = selectedQueueIndex === null ? 0 : selectedQueueIndex;
    playbackState.elapsedMs = 0;
    playbackState.startedAt = 0;

    try {
        await playCurrentTrack(0);
    } catch (error) {
        console.error("Session playback failed:", error);
        setSessionStatus(error.message || "Session playback stopped.", "error");
        await stopSession({ silent: true });
    }
}

async function pauseSession() {
    if (!playbackState.running) {
        return;
    }

    if (playbackState.paused) {
        await resumeSession();
        return;
    }

    playbackState.elapsedMs = getPlaybackElapsed();
    playbackState.paused = true;
    playbackState.sequence += 1;
    clearPlaybackTimers();
    await api.pausePlayback();
    setSessionStatus("Session paused.");
    renderQueue();
    updatePlaybackControls();
}

async function resumeSession() {
    if (!playbackState.running || !playbackState.paused) {
        return;
    }

    try {
        await playCurrentTrack(playbackState.elapsedMs);
    } catch (error) {
        console.error("Could not resume session:", error);
        setSessionStatus(error.message || "Could not resume session.", "error");
        await stopSession({ silent: true });
    }
}

async function advancePlayback() {
    if (!playbackState.running || playbackState.currentIndex === null) {
        return;
    }

    clearPlaybackTimers();

    let nextIndex = playbackState.currentIndex + 1;

    if (nextIndex >= sessionQueue.length) {
        if (loopSessionToggle && loopSessionToggle.checked) {
            nextIndex = 0;
        } else {
            await finishSession();
            return;
        }
    }

    playbackState.currentIndex = nextIndex;
    playbackState.elapsedMs = 0;

    try {
        await playCurrentTrack(0);
    } catch (error) {
        console.error("Could not advance session:", error);
        setSessionStatus(error.message || "Could not advance session.", "error");
        await stopSession({ silent: true });
    }
}

async function skipTrack() {
    if (!playbackState.running) {
        return;
    }

    setSessionStatus("Skipping track.");
    await advancePlayback();
}

async function finishSession() {
    clearPlaybackTimers();
    playbackState.sequence += 1;
    playbackState.running = false;
    playbackState.paused = false;
    playbackState.currentIndex = null;
    playbackState.elapsedMs = 0;
    playbackState.startedAt = 0;

    await api.pausePlayback();
    setSessionStatus("Session complete.");
    renderQueue();
    updatePlaybackControls();
}

async function stopSession(options = {}) {
    if (!playbackState.running && !playbackState.paused) {
        return;
    }

    clearPlaybackTimers();
    playbackState.sequence += 1;
    playbackState.running = false;
    playbackState.paused = false;
    playbackState.currentIndex = null;
    playbackState.elapsedMs = 0;
    playbackState.startedAt = 0;

    await api.pausePlayback();

    if (!options.silent) {
        setSessionStatus("Session stopped.");
    }

    renderQueue();
    updatePlaybackControls();
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

    if (commandPressed && !event.shiftKey && key === "s") {
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
        if (playbackState.paused) {
            resumeSession();
        } else {
            startSession();
        }
        return;
    }

    if (commandPressed && event.shiftKey && key === "a") {
        event.preventDefault();
        analyzeQueue();
        return;
    }

    if (commandPressed && event.shiftKey && key === "s") {
        event.preventDefault();
        applySmartOrdering();
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

    if (event.key === " " && playbackState.running) {
        event.preventDefault();
        pauseSession();
        return;
    }

    if (event.key === "Escape" && playbackState.running) {
        event.preventDefault();
        stopSession();
        return;
    }

    if (event.key === "ArrowRight" && playbackState.running) {
        event.preventDefault();
        skipTrack();
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
applyMoodBtn && applyMoodBtn.addEventListener("click", applyMoodPreset);
analyzeQueueBtn && analyzeQueueBtn.addEventListener("click", analyzeQueue);
smartOrderBtn && smartOrderBtn.addEventListener("click", () => applySmartOrdering());
applyTemplateBtn && applyTemplateBtn.addEventListener("click", applySessionTemplate);
savedSessionSelect && savedSessionSelect.addEventListener("change", loadSelectedSession);
sessionNameInput && sessionNameInput.addEventListener("change", () => {
    updateActiveSessionName(sessionNameInput.value);
    persistStore();
    renderSessionControls();
});
startSessionBtn && startSessionBtn.addEventListener("click", startSession);
pauseSessionBtn && pauseSessionBtn.addEventListener("click", pauseSession);
stopSessionBtn && stopSessionBtn.addEventListener("click", stopSession);
skipTrackBtn && skipTrackBtn.addEventListener("click", skipTrack);
loopSessionToggle && loopSessionToggle.addEventListener("change", updatePlaybackControls);
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
