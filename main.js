const { BrowserWindow, app, ipcMain } = require("electron");
const path = require("path");

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
    const CLIENT_ID = "a043acd359be4dae8ddf4885e984d1f8";
    const REDIRECT_URI = "http://127.0.0.1:3000/callback";
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

    // FIX 1: Listen to webContents for "will-navigate"
    authWindow.webContents.on("will-navigate", (event, url) => {
        // FIX 2: Corrected the function name to handleCallbackUrl
        handleCallbackUrl(url, authWindow);
    });

    authWindow.webContents.on("did-redirect-navigation", (event, url) => {
        handleCallbackUrl(url, authWindow);
    });
});

// main.js

// 1. Modified to be an async function so we can wait for the token response
async function handleCallbackUrl(url, authWindow) {
    if (url.startsWith("http://127.0.0.1:3000/callback")) {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get("code");

        if (code) {
            console.log("SUCCESS! Captured raw authentication code.");
            
            // Close the pop-up window immediately to clear the UI
            authWindow.close();
            
            // Trigger the token swap exchange
            await exchangeCodeForTokens(code);
        }
    }
}

// New helper function to execute the secure token handshake
async function exchangeCodeForTokens(code) {
    const CLIENT_ID = "a043acd359be4dae8ddf4885e984d1f8";
    // Ensure there are no spaces or hidden characters around your secret string!
    const CLIENT_SECRET = "c52350aeb8984ffaa323cccaf41210ca"; 
    const REDIRECT_URI = "http://127.0.0.1:3000/callback";

    console.log("Exchanging authentication code for functional tokens...");

    try {
        // Explicitly ensuring clean standard HTTPS destination
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
            console.log("=========================================");
            console.log("SPOTIFY TOKENS ACQUIRED SUCCESSFULLY!");
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

// Temporary Test Hook to verify Player Device handshake
async function testSpotifyPlayback(accessToken) {
    console.log("Querying for active target music devices...");
    try {
        const res = await fetch("https://api.spotify.com/v1/me/player/devices", {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const devicesData = await res.json();
        
        console.log("\n--- AVAILABLE AV DEVICES ---");
        if(devicesData.devices && devicesData.devices.length > 0) {
            devicesData.devices.forEach(d => {
                console.log(`> Device Name: ${d.name} | Type: ${d.type} | Active: ${d.is_active}`);
            });
            console.log("----------------------------\n");
            console.log("STEP 5 VALIDATION COMPLETE: You are clear to start building the Hook Engine queue controller logic!");
        } else {
            console.log("No active device found. Open your Spotify Desktop app on your computer, play a random song for 2 seconds, and try logging in again!");
        }
    } catch (err) {
        console.error("Device verification poll failed:", err);
    }
}