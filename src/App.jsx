import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AppContext = createContext();

// Safe Interop with your Electron Context Bridge
const api = window.electronAPI || {
    loadStore: async () => ({ activeSession: { queue: [] }, hookDb: {}, sessions: {} }),
    saveStore: async () => {},
    playHook: async () => {},
    pausePlayback: async () => ({ ok: true }),
    analyzeTrackStructure: async () => ({ ok: false }),
    loginWithSpotify: () => {},
    onSpotifyConnected: () => {},
    exportSession:async()=>({canceled:true}),
    importSession:async()=>({canceled:true})
};

export const AppProvider = ({ children }) => {
    // 1. Core Persistent State
    const [sessionQueue, setSessionQueue] = useState([]);
    const [hookDb, setHookDb] = useState({});
    const [savedSessions, setSavedSessions] = useState({});
    const [activeSessionName, setActiveSessionName] = useState("Untitled Session");
    const [activeMoodKey, setActiveMoodKey] = useState("balanced");
    const [selectedQueueIndex, setSelectedQueueIndex] = useState(null);

    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    // 2. Playback Runtime Engine State
    const [playback, setPlayback] = useState({
        running: false,
        paused: false,
        currentIndex: null,
        elapsedMs: 0
    });

    const playbackSequence = useRef(0);
    const timeoutId = useRef(null);
    const progressIntervalId = useRef(null);
    const startedAt = useRef(0);

    // Bind listener to capture successful authentication signals from Electron main background process
    useEffect(() => {
        if (api.onSpotifyConnected) {
            api.onSpotifyConnected((data) => {
                console.log("Handshake successful! Tokens captured:", data);
                setIsConnected(true);
                setIsConnecting(false);
            });
        }
    }, []);

    // Load initial data from Electron store layer on launch
    useEffect(() => {
        async function initStore() {
            try {
                const store = await api.loadStore();
                if (store && store.activeSession) {
                    setSessionQueue(store.activeSession.queue || []);
                    setActiveSessionName(store.activeSession.name || "Untitled Session");
                    setActiveMoodKey(store.activeSession.moodKey || "balanced");
                }
                if (store) {
                    setHookDb(store.hookDb || {});
                    setSavedSessions(store.sessions || {});
                }
            } catch (err) {
                console.error("Failed to load store:", err);
            }
        }
        initStore();
    }, []);

    // Save back to store automatically whenever core state vectors change
    useEffect(() => {
        if (sessionQueue.length === 0 && Object.keys(hookDb).length === 0) return;
        
        api.saveStore({
            hookDb,
            sessions: savedSessions,
            activeSession: {
                name: activeSessionName,
                moodKey: activeMoodKey,
                queue: sessionQueue,
                updatedAt: new Date().toISOString()
            }
        });
    }, [sessionQueue, hookDb, savedSessions, activeSessionName, activeMoodKey]);

    // 4. Playback Core Controller Actions
    const clearTimers = () => {
        if (timeoutId.current) clearTimeout(timeoutId.current);
        if (progressIntervalId.current) clearInterval(progressIntervalId.current);
    };

    // Move a queued track up by one position safely
    const moveTrackUp = (index) => {
        if (index <= 0 || index >= sessionQueue.length) return;
        
        // If the active track is moving, adjust the current running playback index tracker
        if (playback.running && playback.currentIndex === index) {
            setPlayback(prev => ({ ...prev, currentIndex: index - 1 }));
        } else if (playback.running && playback.currentIndex === index - 1) {
            setPlayback(prev => ({ ...prev, currentIndex: index }));
        }

        const updatedQueue = [...sessionQueue];
        const temp = updatedQueue[index];
        updatedQueue[index] = updatedQueue[index - 1];
        updatedQueue[index - 1] = temp;

        setSessionQueue(updatedQueue);
        setSelectedQueueIndex(index - 1);
    };

    // Move a queued track down by one position safely
    const moveTrackDown = (index) => {
        if (index < 0 || index >= sessionQueue.length - 1) return;

        // Adjust running playback tracker index if moving the active song
        if (playback.running && playback.currentIndex === index) {
            setPlayback(prev => ({ ...prev, currentIndex: index + 1 }));
        } else if (playback.running && playback.currentIndex === index + 1) {
            setPlayback(prev => ({ ...prev, currentIndex: index }));
        }

        const updatedQueue = [...sessionQueue];
        const temp = updatedQueue[index];
        updatedQueue[index] = updatedQueue[index + 1];
        updatedQueue[index + 1] = temp;

        setSessionQueue(updatedQueue);
        setSelectedQueueIndex(index + 1);
    };

    const getTrackDuration = (track) => {
        return track ? Math.max(0, track.hookEnd - track.hookStart) : 0;
    };

    const playCurrentTrack = async (index, offsetMs = 0) => {
        const track = sessionQueue[index];
        if (!track) {
            stopSession();
            return;
        }

        playbackSequence.current += 1;
        const currentSeq = playbackSequence.current;

        clearTimers();
        startedAt.current = Date.now() - offsetMs;

        setPlayback({
            running: true,
            paused: false,
            currentIndex: index,
            elapsedMs: offsetMs
        });

        const duration = getTrackDuration(track);
        const remaining = Math.max(0, duration - offsetMs);

        await api.playHook(track.uri, track.hookStart + offsetMs);

        if (currentSeq !== playbackSequence.current) return;

        timeoutId.current = setTimeout(() => {
            advanceTrack(index);
        }, remaining);

        progressIntervalId.current = setInterval(() => {
            const currentElapsed = Date.now() - startedAt.current;
            setPlayback(prev => ({
                ...prev,
                elapsedMs: Math.min(currentElapsed, duration)
            }));
        }, 250);
    };

    const startSession = () => {
        if (sessionQueue.length === 0) return;
        const targetIndex = selectedQueueIndex !== null ? selectedQueueIndex : 0;
        playCurrentTrack(targetIndex, 0);
    };

    const pauseSession = async () => {
        if (!playback.running) return;

        if (playback.paused) {
            playCurrentTrack(playback.currentIndex, playback.elapsedMs);
        } else {
            clearTimers();
            playbackSequence.current += 1;
            await api.pausePlayback();
            setPlayback(prev => ({ ...prev, paused: true }));
        }
    };

    const stopSession = async () => {
        clearTimers();
        playbackSequence.current += 1;
        await api.pausePlayback();
        setPlayback({
            running: false,
            paused: false,
            currentIndex: null,
            elapsedMs: 0
        });
    };

    const advanceTrack = (currentIndex) => {
        const nextIndex = currentIndex + 1;
        if (nextIndex < sessionQueue.length) {
            playCurrentTrack(nextIndex, 0);
        } else {
            stopSession();
        }
    };

    const skipTrack = () => {
        if (playback.currentIndex !== null) {
            advanceTrack(playback.currentIndex);
        }
    };

    const triggerSpotifyLogin = () => {
        setIsConnecting(true);
        if (api.loginWithSpotify) {
            api.loginWithSpotify();
        }
    };

    const saveCurrentSessionAsPreset = () => {
        const trimmedName = activeSessionName.trim();
        if (!trimmedName) return;

        const newSessionObj = {
            name: trimmedName,
            moodKey: activeMoodKey,
            queue: sessionQueue,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const updatedSessions = {
            ...savedSessions,
            [trimmedName]: newSessionObj
        };

        setSavedSessions(updatedSessions);
        
        // Explicitly fire an overarching store save command immediately over IPC
        api.saveStore({
            hookDb,
            sessions: updatedSessions,
            activeSession: {
                name: trimmedName,
                moodKey: activeMoodKey,
                queue: sessionQueue,
                updatedAt: new Date().toISOString()
            }
        });
        alert(`Session "${trimmedName}" saved successfully!`);
    };

    const loadSavedSessionProfile = (nameKey) => {
        const target = savedSessions[nameKey];
        if (!target) return;

        stopSession();
        setActiveSessionName(target.name);
        setActiveMoodKey(target.moodKey || "balanced");
        setSessionQueue(target.queue || []);
        setSelectedQueueIndex(null);
    };

    const handleExportClick = async () => {
        try {
            const result = await api.exportSession({
                name: activeSessionName,
                moodKey: activeMoodKey,
                queue: sessionQueue,
                hookDb: hookDb
            });
            if (result && !result.canceled) {
                alert(`Exported cleanly to:\n${result.filePath}`);
            }
        } catch (err) {
            console.error(err);
            alert("Export failed.");
        }
    };

    const handleImportClick = async () => {
        try {
            const result = await api.importSession();
            if (result && !result.canceled && result.session) {
                stopSession();
                setActiveSessionName(result.session.name || "Imported Session");
                setActiveMoodKey(result.session.moodKey || "balanced");
                setSessionQueue(result.session.queue || []);
                if (result.hookDb) {
                    setHookDb(prev => ({ ...prev, ...result.hookDb }));
                }
                alert("Session imported successfully!");
            }
        } catch (err) {
            console.error(err);
            alert("Import failed. Make sure it's a valid session JSON file.");
        }
    };

    const analyzeQueueStructure = async () => {
        const updatedQueue = await Promise.all(sessionQueue.map(async (track) => {
            try {
                if (!track.preview_url) return track;

                const response = await api.analyzeTrackStructure(track.preview_url);
                if (response && response.ok) {
                    const calculatedStart = response.hookStart;
                    const calculatedEnd = calculatedStart + (30 * 1000); 

                    return {
                        ...track,
                        hookStart: calculatedStart,
                        hookEnd: calculatedEnd,
                        analysis:response.analysis,
                        structuralSource: "local-audio-analysis"
                    };
                }
            } catch (err) {
                console.warn(`Could not analyze waveform bounds for: ${track.name}`, err);
            }
            return track;
        }));
        setSessionQueue(updatedQueue);
    };

    return (
        <AppContext.Provider value={{
            sessionQueue, setSessionQueue,
            hookDb, setHookDb,
            savedSessions, setSavedSessions,
            activeSessionName, setActiveSessionName,
            activeMoodKey, setActiveMoodKey,
            selectedQueueIndex, setSelectedQueueIndex,
            playback, startSession, pauseSession, stopSession, skipTrack, getTrackDuration,
            analyzeQueueStructure,
            
            isConnected,
            isConnecting,
            triggerSpotifyLogin,
            moveTrackUp,moveTrackDown,
            saveCurrentSessionAsPreset, loadSavedSessionProfile, handleExportClick, handleImportClick
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);