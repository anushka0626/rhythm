import React from 'react';
import { useApp } from '../App.jsx';

export const PlaybackPanel = () => {
    const { 
        playback, startSession, pauseSession, stopSession, skipTrack, sessionQueue, getTrackDuration, 
        analyzeQueueStructure, isConnected, isConnecting, triggerSpotifyLogin 
    } = useApp();

    const activeTrack = playback.currentIndex !== null ? sessionQueue[playback.currentIndex] : null;
    const duration = getTrackDuration(activeTrack);
    const progressPercent = duration ? (playback.elapsedMs / duration) * 100 : 0;
    const formatTime = (ms) => `${Math.round(ms / 1000)}s`;

    return (
        <div className="playback-panel-deck" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div className="connection-status-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#181818', padding: '12px', borderRadius: '6px', border: '1px solid #282828' }}>
                <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Engine Bridge Auth:</span>
                {!isConnected ? (
                    <button 
                        className="btn-session" 
                        onClick={triggerSpotifyLogin} 
                        disabled={isConnecting}
                        style={{ backgroundColor: isConnecting ? '#ebb11a' : '#1DB954', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {isConnecting ? "⚡ Handshaking..." : "Connect Spotify"}
                    </button>
                ) : (
                    <div className="badge" style={{ color: '#1DB954', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        ● System Active
                    </div>
                )}
            </div>

            <div className="playback-meta" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                <span style={{ fontWeight: 'bold', color: '#fff' }}>{activeTrack ? activeTrack.name : "No active track"}</span>
                <span style={{ color: '#888' }}>{formatTime(playback.elapsedMs)} / {formatTime(duration)}</span>
            </div>
            
            <div className="progress-track" style={{ backgroundColor: '#282828', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                <div className="progress-fill" style={{ width: `${progressPercent}%`, backgroundColor: '#1DB954', height: '100%', transition: 'width 0.25s linear' }}></div>
            </div>
            
            <div className="playback-controls" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '5px' }}>
                <button className="btn-session" disabled={!isConnected || playback.running} onClick={startSession} style={{ gridColumn: '1 / span 2', padding: '12px', backgroundColor: '#1DB954', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                    🚀 Launch Sequence
                </button>
                <button className="btn-secondary" disabled={!playback.running} onClick={pauseSession} style={{ padding: '10px', backgroundColor: '#282828', border: '1px solid #333', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>
                    {playback.paused ? "▶️ Resume" : "⏸️ Pause"}
                </button>
                <button className="btn-secondary" disabled={!playback.running} onClick={skipTrack} style={{ padding: '10px', backgroundColor: '#282828', border: '1px solid #333', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>
                    ⏩ Skip Track
                </button>
                <button className="btn-secondary danger" disabled={!playback.running} onClick={stopSession} style={{ gridColumn: '1 / span 2', padding: '10px', backgroundColor: '#da3737', border: 'none', color: '#fff', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                    🛑 Stop Session
                </button>
            </div>

            <button 
                className="btn-secondary structural-analysis-trigger" 
                disabled={!isConnected || sessionQueue.length === 0} 
                onClick={analyzeQueueStructure}
                style={{ width: '100%', marginTop: '5px', padding: '12px', background: '#222', border: '1px solid #333', color: '#ebb11a', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
            >
                ⚡ Compute Phase 3 Audio Intelligence
            </button>
        </div>
    );
};