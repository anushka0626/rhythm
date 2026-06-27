const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    appName: "rhythm",
    //this function lets the frontend trigger a login event in the main backend
    loginWithSpotify: () => ipcRenderer.send("spotify-login-trigger"),
    onSpotifyConnected: (callback) => ipcRenderer.on("spotify-connected", (event, data) => callback(data)),
    fetchPlaylist: (playlistId) =>
    ipcRenderer.invoke(
        "fetch-playlist",
        playlistId
    ),
    analyzeTracks: (trackIds) => ipcRenderer.invoke("analyze-tracks", trackIds),
    playHook: (trackUri,hookTime) =>
    ipcRenderer.invoke(
        "play-hook",
        trackUri,
        hookTime
    ),
    pausePlayback: () => ipcRenderer.invoke("pause-playback"),
    loadStore: () => ipcRenderer.invoke("store-load"),
    saveStore: (storePatch) => ipcRenderer.invoke("store-save", storePatch),
    exportSession: (sessionPayload) => ipcRenderer.invoke("export-session", sessionPayload),
    importSession: () => ipcRenderer.invoke("import-session"),
    analyzeTrackStructure: (trackId) => ipcRenderer.invoke("analyze-track-structure", trackId),
});
