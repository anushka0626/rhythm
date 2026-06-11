const { BrowserWindow, app, ipcMain } = require("electron");
const path = require("path");
const spotifyController = require("./spotify");   //spotify control functions imported


require('dotenv').config({ path: path.join(__dirname, '.env') });
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

let mainWindow;

function createWindow() {
    // Assigned to the global variable so we can access it elsewhere if needed
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
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

// SPOTIFY AUTHENTICATION HERE
ipcMain.on("spotify-login-trigger", () => {
    const CLIENT_ID = process.env.CLIENT_ID;
    const REDIRECT_URI =process.env.REDIRECT_URI;
    const SCOPES = [
        "user-modify-playback-state",
        "user-read-playback-state",
        "user-read-currently-playing",
        "playlist-read-private"
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
            console.log("\nSPOTIFY TOKENS ACQUIRED SUCCESSFULLY!");
            console.log("=========================================");
            mainWindow.webContents.send("spotify-connected", {
                expiresIn: data.expires_in
            });
            setTimeout(() => {
                testSpotifyPlayback(data.access_token);
            }, 1000);
        } else {
            console.error("Spotify API Refused Token Swap:", data);
        }

    } catch (error) {
        console.error("Network Error during Token Exchange Execution:", error);
        
        console.log("\nQuick Troubleshooting Tip:");
        console.log("If you are using a college WiFi network, a VPN, or a strict third-party Antivirus/Firewall, they might be intercepting SSL requests. Try switching to a mobile hotspot to verify if it's a network filter block!");
    }
}


async function testSpotifyPlayback(accessToken) {
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
}