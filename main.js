const { BrowserWindow, app, ipcMain, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const spotifyController = require("./spotify");   //spotify control functions imported


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
        if (!uri) {
            return;
        }

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
    if (!Array.isArray(queue)) {
        return [];
    }

    return queue
        .filter((track) => track && track.uri)
        .map((track) => {
            const hookStart = toNumber(track.hookStart);

            return {
                uri: String(track.uri),
                name: String(track.name || "Untitled Track"),
                artist: track.artist ? String(track.artist) : "",
                hookStart,
                hookEnd: normalizeHookEnd(track.hookEnd, hookStart)
            };
        });
}

function normalizeSession(rawSession = {}) {
    rawSession = rawSession || {};

    const now = new Date().toISOString();
    const name = String(rawSession.name || "Untitled Session").trim() || "Untitled Session";

    return {
        name,
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
    if (rawPayload.session) {
        return rawPayload.session;
    }

    if (rawPayload.activeSession) {
        return rawPayload.activeSession;
    }

    if (rawPayload.queue || rawPayload.sessionQueue) {
        return rawPayload;
    }

    if (rawPayload.sessions && typeof rawPayload.sessions === "object") {
        const firstSession = Object.values(rawPayload.sessions)[0];
        if (firstSession) {
            return firstSession;
        }
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

function createWindow() {
    // Assigned to the global variable so we can access it elsewhere if needed
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            partition: 'trusted'+ Date.now(),
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js")
        }
    });

    mainWindow.loadFile(path.join(__dirname, "index.html"));
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

    if (result.canceled || !result.filePath) {
        return { canceled: true };
    }

    await fs.promises.writeFile(result.filePath, JSON.stringify(exportPayload, null, 2), "utf8");

    return {
        canceled: false,
        filePath: result.filePath
    };
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

    if (result.canceled || !result.filePaths.length) {
        return { canceled: true };
    }

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

// SPOTIFY AUTHENTICATION HERE
ipcMain.on("spotify-login-trigger", () => {
    const CLIENT_ID = process.env.CLIENT_ID;
    const REDIRECT_URI =process.env.REDIRECT_URI;
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
        const tracks =
            await spotifyController.getPlaylistTracks( global.spotifyAccessToken,playlistId);
        return tracks;

    } catch (err) {
        console.error(err);
        return null;
    }
});

ipcMain.handle("play-hook",
    async (event, trackUri,hookTime) => {
        console.log( "Play hook requested:",trackUri);
        //console.log("Track: ",trackUri);
        //onsole.log("hook:", hookTime);
        const res= await fetch("https://api.spotify.com/v1/me/player/devices",{
            headers: {
                Authorization: `Bearer ${global.spotifyAccessToken}`
            }
        });
        const devicesData= await res.json();
        if(!devicesData.devices.length ){
            console.log("no devices found");
            return;  
        }
        const device= devicesData.devices.find(d=>d.is_active) ||devicesData.devices[0];
        console.log("using device: ",device.name);
        await spotifyController.playTrack(global.spotifyAccessToken,trackUri,device.id);
        setTimeout(async()=>{
            await spotifyController.seekToPosition(global.spotifyAccessToken,hookTime,device.id);
        },750);
    }
);  

async function handleCallbackUrl(url, authWindow) {
    if (url.startsWith("http://127.0.0.1:3000/callback")) {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get("code");

        if (code) {
            console.log("SUCCESS! Captured raw authentication code.");

            // Close the pop-up window immediately to clear the UI
            authWindow.close();
            await exchangeCodeForTokens(code);
        }
    }
}

// New helper function to execute the secure token handshake
async function exchangeCodeForTokens(code) {
    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    const REDIRECT_URI = process.env.REDIRECT_URI;

    console.log("Exchanging authentication code for functional tokens...");

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
            }).toString() // Ensure it compiles cleanly to a query string
        });

        const data = await response.json();

        if (response.ok) {
            console.log("\nSPOTIFY TOKENS ACQUIRED SUCCESSFULLY!\n------------------");
            mainWindow.webContents.send("spotify-connected", {
                expiresIn: data.expires_in
            });
            global.spotifyAccessToken = data.access_token;
           
           /* const meResponse = await fetch(
                    "https://api.spotify.com/v1/me",
                    {
                        headers: {
                            Authorization: `Bearer ${data.access_token}`
                        }
                    }
                );

                console.log("ME STATUS:", meResponse.status);
                console.log(await meResponse.text());*/
            /*setTimeout(() => {
                testSpotifyPlayback(data.access_token);
            }, 1000);*/
        } else {
            console.error("Spotify API Refused Token Swap:", data);
        }

    } catch (error) {
        console.error("Network Error during Token Exchange Execution:", error);
        console.log("\nQuick Troubleshooting Tip:");
        console.log("If you are using a college WiFi network, a VPN, or a strict third-party Antivirus/Firewall, they might be intercepting SSL requests. Try switching to a mobile hotspot to verify if it's a network filter block!");
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
