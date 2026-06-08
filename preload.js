const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    appName: "VibeCheck"
});