const { BrowserWindow, app, ipcMain, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const spotifyController = require("./spotify");

// Force clean software rasterization backends programmatically to prevent Linux GPU freezes
if (process.platform === 'linux') {
    app.commandLine.appendSwitch('disable-gpu-rasterization');
    app.commandLine.appendSwitch('disable-software-rasterizer');
}

require('dotenv').config({ path: path.join(__dirname, '.env') });
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

let mainWindow;
const STORE_VERSION = 1;
const DEFAULT_HOOK_LENGTH = 30 * 1000;

function createEmptyStore() {
    return {
        version: STORE_VERSION,
        hookDb: {},
        sessions: {},
        activeSession: {
            name: "Untitled Session",
            queue: [],
            updatedAt: null
        }
    };
} 

function getStorePath() { 
    return path.join(app.getPath("userData"), "rhythm-store.json");
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeHookEnd(value, start) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > start
        ? parsed
        : start + DEFAULT_HOOK_LENGTH;
}

function normalizeHookDb(rawHookDb = {}) {
    const hookDb = {};
    Object.entries(rawHookDb || {}).forEach(([uri, hook]) => {
        if (!uri) return;
        if (typeof hook === "number") {
            hookDb[uri] = {
                start: toNumber(hook),
                end: toNumber(hook) + DEFAULT_HOOK_LENGTH
            };
            return;
        }
        const start = toNumber(hook && hook.start);
        hookDb[uri] = {
            start,
            end: normalizeHookEnd(hook && hook.end, start)
        };
    });
    return hookDb;
}

function normalizeQueue(queue = []) {
    if (!Array.isArray(queue)) return [];
    return queue
        .filter((track) => track && track.uri)
        .map((track) => {
            const hookStart = toNumber(track.hookStart);
            return {
                id: track.id ? String(track.id) : "",
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
                hookEnd: normalizeHookEnd(track.hookEnd, hookStart),
                analysis: track.analysis && typeof track.analysis === "object" ? track.analysis : null,
                transition: track.transition && typeof track.transition === "object" ? track.transition : null
            };
        });
}

function normalizeSession(rawSession = {}) {
    rawSession = rawSession || {};
    const now = new Date().toISOString();
    const name = String(rawSession.name || "Untitled Session").trim() || "Untitled Session";
    return {
        name,
        moodKey: rawSession.moodKey ? String(rawSession.moodKey) : "balanced",
        queue: normalizeQueue(rawSession.queue || rawSession.sessionQueue),
        createdAt: rawSession.createdAt || now,
        updatedAt: rawSession.updatedAt || now
    };
}

function normalizeSessions(rawSessions = {}) {
    const sessions = {};
    Object.entries(rawSessions || {}).forEach(([key, rawSession]) => {
        const session = normalizeSession({
            name: rawSession && rawSession.name ? rawSession.name : key,
            ...rawSession
        });
        sessions[session.name] = session;
    });
    return sessions;
}

function normalizeStore(rawStore = {}) {
    const emptyStore = createEmptyStore();
    const activeSession = normalizeSession(rawStore.activeSession || emptyStore.activeSession);
    return {
        version: STORE_VERSION,
        hookDb: normalizeHookDb(rawStore.hookDb),
        sessions: normalizeSessions(rawStore.sessions),
        activeSession
    };
}

function getImportSessionPayload(rawPayload = {}) {
    if (rawPayload.session) return rawPayload.session;
    if (rawPayload.activeSession) return rawPayload.activeSession;
    if (rawPayload.queue || rawPayload.sessionQueue) return rawPayload;
    if (rawPayload.sessions && typeof rawPayload.sessions === "object") {
        const firstSession = Object.values(rawPayload.sessions)[0];
        if (firstSession) return firstSession;
    }
    return null;
}

function safeFileName(value) {
    return String(value || "rhythm-session")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80) || "rhythm-session";
}

async function readStore() {
    try {
        const raw = await fs.promises.readFile(getStorePath(), "utf8");
        return normalizeStore(JSON.parse(raw));
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error("Could not read Rhythm store:", error);
        }
        return createEmptyStore();
    }
}

async function writeStore(store) {
    const normalizedStore = normalizeStore(store);
    const storePath = getStorePath();
    await fs.promises.mkdir(path.dirname(storePath), { recursive: true });
    await fs.promises.writeFile(storePath, JSON.stringify(normalizedStore, null, 2), "utf8");
    return normalizedStore;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getPlaybackDevice(preferredDeviceId = null) {
    if (!global.spotifyAccessToken) {
        throw new Error("Spotify is not connected.");
    }
    const res = await fetch("https://api.spotify.com/v1/me/player/devices", {
        headers: { Authorization: `Bearer ${global.spotifyAccessToken}` }
    });
    const devicesData = await res.json();
    const devices = Array.isArray(devicesData.devices) ? devicesData.devices : [];
    if (!devices.length) return null;
    return devices.find((device) => device.id === preferredDeviceId)
        || devices.find((device) => device.is_active)
        || devices[0];
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            partition: 'trusted' + Date.now(),
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js")
        }
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, "dist/index.html"));
    }
}

app.whenReady().then(() => {
    createWindow();
});

ipcMain.handle("store-load", async () => {
    return readStore();
});

ipcMain.handle("store-save", async (event, storePatch) => {
    const currentStore = await readStore();
    return writeStore({
        ...currentStore,
        ...(storePatch || {})
    });
});

ipcMain.handle("export-session", async (event, payload) => {
    const session = normalizeSession((payload && (payload.session || payload.activeSession)) || payload);
    const hookDb = normalizeHookDb(payload && payload.hookDb);
    const exportPayload = {
        version: STORE_VERSION,
        exportedAt: new Date().toISOString(),
        session,
        hookDb
    };

    const result = await dialog.showSaveDialog(mainWindow, {
        title: "Export Rhythm Session",
        defaultPath: `${safeFileName(session.name)}.rhythm-session.json`,
        filters: [
            { name: "Rhythm Session", extensions: ["json"] },
            { name: "All Files", extensions: ["*"] }
        ]
    });

    if (result.canceled || !result.filePath) return { canceled: true };
    await fs.promises.writeFile(result.filePath, JSON.stringify(exportPayload, null, 2), "utf8");
    return { canceled: false, filePath: result.filePath };
});

ipcMain.handle("import-session", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: "Import Rhythm Session",
        properties: ["openFile"],
        filters: [
            { name: "Rhythm Session", extensions: ["json"] },
            { name: "All Files", extensions: ["*"] }
        ]
    });

    if (result.canceled || !result.filePaths.length) return { canceled: true };
    const raw = await fs.promises.readFile(result.filePaths[0], "utf8");
    const parsed = JSON.parse(raw);
    const importedSession = getImportSessionPayload(parsed);

    if (!importedSession) {
        throw new Error("The selected file does not contain a Rhythm session.");
    }
    return {
        canceled: false,
        filePath: result.filePaths[0],
        session: normalizeSession(importedSession),
        hookDb: normalizeHookDb(parsed.hookDb)
    };
});

// Programmatic Audio Structure Analysis via child Python process execution
ipcMain.handle("analyze-track-structure", async (event, previewUrl) => {
    return new Promise((resolve) => {
        try {
            const { execFile } = require("child_process");
            if (!previewUrl || !previewUrl.startsWith("http")) {
                return resolve({ ok: false, error: "No valid preview URL available." });
            }
            const scriptPath = path.join(__dirname, "analyzer.py");
            execFile("python3", [scriptPath, previewUrl], (error, stdout, stderr) => {
                if (error) {
                    console.error("Python engine failed:", stderr || error.message);
                    return resolve({ ok: false, error: "Audio engine execution failed" });
                }
                try {
                    const output = JSON.parse(stdout.trim());
                    resolve(output);
                } catch (parseError) {
                    resolve({ ok: false, error: "Failed to read engine output matrix" });
                }
            });
        } catch (error) {
            console.error("IPC analysis execution crash:", error);
            resolve({ ok: false, error: error.message });
        }
    });
});

ipcMain.on("spotify-login-trigger", () => {
    const CLIENT_ID = process.env.CLIENT_ID;
    const REDIRECT_URI = process.env.REDIRECT_URI;
    const SCOPES = [
        "user-modify-playback-state",
        "user-read-playback-state",
        "user-read-currently-playing",
        "playlist-read-private",
        "playlist-read-collaborative"
    ].join(" ");

    const authUrl = `https://accounts.spotify.com/authorize?` + 
                    `client_id=${CLIENT_ID}` +
                    `&response_type=code` +
                    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                    `&scope=${encodeURIComponent(SCOPES)}`;
    
    const authWindow = new BrowserWindow({
        width: 600,
        height: 800,
        show: true,
        alwaysOnTop: true,
        autoHideMenuBar: true
    });

    authWindow.loadURL(authUrl);

    authWindow.webContents.on("will-navigate", (event, url) => {
        handleCallbackUrl(url, authWindow);
    });
    authWindow.webContents.on("did-redirect-navigation", (event, url) => {
        handleCallbackUrl(url, authWindow);
    });
});

ipcMain.handle("fetch-playlist", async (event, playlistId) => {
    try {
        return await spotifyController.getPlaylistTracks(global.spotifyAccessToken, playlistId);
    } catch (err) {
        console.error(err);
        return null;
    }
});

ipcMain.handle("analyze-tracks", async (event, payload) => {
    const trackIds = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.trackIds) ? payload.trackIds : []);
    const artistIds = payload && Array.isArray(payload.artistIds) ? payload.artistIds : [];
    let features = [];
    let artists = [];
    let featureError = null;
    let artistError = null;

    try {
        features = await spotifyController.getAudioFeatures(global.spotifyAccessToken, trackIds);
    } catch (error) {
        featureError = error;
        console.error("Audio features unavailable:", error);
    }

    try {
        artists = await spotifyController.getArtists(global.spotifyAccessToken, artistIds);
    } catch (error) {
        artistError = error;
        console.error("Artist metadata unavailable:", error);
    }

    return {
        ok: !featureError || !artistError,
        features,
        artists,
        featureError: featureError ? { status: featureError.status || null, message: featureError.message } : null,
        artistError: artistError ? { status: artistError.status || null, message: artistError.message } : null
    };
});

ipcMain.handle("play-hook", async (event, trackUri, hookTime, preferredDeviceId = null) => {
    try {
        const hookPositionMs = Math.max(0, toNumber(hookTime));
        const device = await getPlaybackDevice(preferredDeviceId);
        if (!device) return { ok: false, error: "No Spotify devices found." };

        const playSuccess = await spotifyController.playTrack(global.spotifyAccessToken, trackUri, device.id, hookPositionMs);
        if (!playSuccess) return { ok: false, error: "Spotify rejected playback." };

        await delay(500);
        const seekSuccess = await spotifyController.seekToPosition(global.spotifyAccessToken, hookPositionMs, device.id);
        return { ok: seekSuccess, deviceId: device.id, deviceName: device.name };
    } catch (error) {
        console.error("Could not play hook:", error);
        return { ok: false, error: error.message || "Could not play hook." };
    }
});

ipcMain.handle("pause-playback", async (event, preferredDeviceId = null) => {
    try {
        const device = await getPlaybackDevice(preferredDeviceId);
        if (!device) return { ok: false, error: "No Spotify devices found." };
        const paused = await spotifyController.pausePlayback(global.spotifyAccessToken, device.id);
        return { ok: paused, deviceId: device.id, deviceName: device.name };
    } catch (error) {
        console.error("Could not pause playback:", error);
        return { ok: false, error: error.message || "Could not pause playback." };
    }
});

async function handleCallbackUrl(url, authWindow) {
    if (url.includes("/callback")) {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get("code");
        if (code) {
            console.log("SUCCESS! Captured raw authentication code.");
            await exchangeCodeForTokens(code);
            authWindow.close();
        }
    }
}

async function exchangeCodeForTokens(code) {
    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    const REDIRECT_URI = process.env.REDIRECT_URI;

    try {
        const tokenUrl = "https://accounts.spotify.com/api/token";        
        const credentialsBase64 = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${credentialsBase64}`
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: REDIRECT_URI
            }).toString()
        });
        const data = await response.json();

        if (response.ok) {
            console.log("\nSPOTIFY TOKENS ACQUIRED SUCCESSFULLY!\n------------------");
            global.spotifyAccessToken = data.access_token;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("spotify-connected", { expiresIn: data.expires_in });
            }
        } else {
            console.error("Spotify API Refused Token Swap:", data);
        }
    } catch (error) {
        console.error("Network Error during Token Exchange Execution:", error);
    }
}
  

/*async function testSpotifyPlayback(accessToken) {
    console.log("Initializing Phase 1 Hook Engine Simulation...");
    try {
        // 1. Fetch available devices to find your laptop's unique system ID
        const res = await fetch("https://api.spotify.com/v1/me/player/devices", {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const devicesData = await res.json();
    
        let targetDeviceId = null;

        if (devicesData.devices && devicesData.devices.length > 0) {
            const activeDevice = devicesData.devices.find(d => d.is_active) || 
                                 devicesData.devices.find(d => d.type === "Computer") || 
                                 devicesData.devices[0];
            
            targetDeviceId = activeDevice.id;
            console.log("FULL DEVICE:");
            console.log(JSON.stringify(activeDevice, null, 2));
            console.log(`Targeting Device Profile: ${activeDevice.name} (${activeDevice.type})`);
        } else {
            console.log("No player instances detected. Try playing a song manually first!");
            return;
        }

        const targetTrackUri = "spotify:track:3AzjcOeAmA57TIOr9zF1ZW"; // physical
        const hookStartTimeMs = 60000; // seek to 1 min

        console.log("Attempting to wake up and hijack the playback pipeline...");
        
        // 2. Try playing the track
        let playSuccess = await spotifyController.playTrack(accessToken, targetTrackUri, targetDeviceId, hookStartTimeMs);
        
        if (!playSuccess) {
            console.log("Spotify session is ghosting. Sending a force-wake nudge in 2 seconds...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log(" Retrying playback initiation...");
            playSuccess = await spotifyController.playTrack(accessToken, targetTrackUri, targetDeviceId);
        }
        
        if (playSuccess) {
            console.log("Waiting for track to buffer...");
            setTimeout(async () => {
                await spotifyController.seekToPosition(
                    accessToken,
                    hookStartTimeMs,
                    targetDeviceId
                );

                console.log("Hook playback started.");
            }, 750);
            
        } else {
            console.log("Playback initiation failed after retry. Try pausing and unpausing your desktop app manually once, then run npm start again!");
        }

    } catch (err) {
        console.error("Error inside your test runner loop:", err);
    }
}*/
