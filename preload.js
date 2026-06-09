const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    appName: "rhythm",
    //this function lets the frontend trigger a login event in the main backend
    loginWithSpotify: () => ipcRenderer.send("spotify-login-trigger"),
    onSpotifyConnected: (callback) => ipcRenderer.on("spotify-connected", (event, data) => callback(data))
});