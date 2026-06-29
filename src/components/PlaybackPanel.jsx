import React from 'react';
import { useApp } from '../App.jsx';

export const PlaybackPanel = () => {
    const { 
        playback, startSession, pauseSession, stopSession, skipTrack, sessionQueue, getTrackDuration, 
        analyzeQueueStructure, isConnected, selectedQueueIndex
    } = useApp();

    const inspectorIndex = selectedQueueIndex !== null ? selectedQueueIndex : playback.currentIndex;
    const inspectedTrack = inspectorIndex !== null ? sessionQueue[inspectorIndex] : null;
    
    const activeTrack = playback.currentIndex !== null ? sessionQueue[playback.currentIndex] : null;
    const duration = getTrackDuration(activeTrack);
    const progressPercent = duration ? (playback.elapsedMs / duration) * 100 : 0;
    const formatTime = (ms) => `${Math.round(ms / 1000)}s`;

    return (
        <div className="studio-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#6a6b70', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🎛️ controls
            </h4>

            {/* Current Timeline Display */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '1rem', maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activeTrack ? activeTrack.name : "No Active Transport"}
                    </span>
                    <span style={{ color: '#6a6b70', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                        {formatTime(playback.elapsedMs)} / {formatTime(duration)}
                    </span>
                </div>
                
                {/* Modern Track Progress Bar Line */}
                <div style={{ backgroundColor: '#1a1b20', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPercent}%`, backgroundColor: '#1db954', height: '100%', transition: 'width 0.25s linear' }}></div>
                </div>
            </div>
            
            {/* Control Matrix Buttons Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button className="btn-studio primary" disabled={!isConnected || playback.running} onClick={startSession} style={{ gridColumn: '1 / span 2', padding: '12px' }}>
                    ▶️ Start
                </button>
                <button className="btn-studio" disabled={!playback.running} onClick={pauseSession}>
                    {playback.paused ? "▶️ Resume" : "⏸️ Pause"}
                </button>
                <button className="btn-studio" disabled={!playback.running} onClick={skipTrack}>
                    ⏩ Skip Track
                </button>
                <button className="btn-studio danger" disabled={!playback.running} onClick={stopSession} style={{ gridColumn: '1 / span 2', marginTop: '4px' }}>
                    🛑 Terminate Session
                </button>
            </div>

            {/* Local Engine Activation Bridge Trigger */}
            <button 
                className="btn-studio accent" 
                disabled={sessionQueue.length === 0} 
                onClick={analyzeQueueStructure}
                style={{ width: '100%', padding: '12px', marginTop: '4px' }}
            >
                ⚡ Compute Phase 3 Audio Intelligence
            </button>

            {/* Acoustic Inspector Sub-Card Grid Block */}
            <div style={{ background: '#1a1b20', borderRadius: '6px', padding: '14px', border: '1px solid #1f2026' }}>
                <div style={{ fontSize: '0.75rem', color: '#6a6b70', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    📋 Inspected Track Profile
                </div>
                {inspectedTrack ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', borderBottom: '1px solid #2a2b30', paddingBottom: '6px' }}>{inspectedTrack.name}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div style={{ background: '#121316', padding: '8px', borderRadius: '4px', border: '1px solid #1f2026' }}>
                                <div style={{ fontSize: '0.7rem', color: '#6a6b70', fontWeight: 600 }}>TEMPO</div>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1db954' }}>{inspectedTrack.analysis?.bpm || '---'}</span> <span style={{ fontSize: '0.75rem', color: '#4a4b50' }}>BPM</span>
                            </div>
                            <div style={{ background: '#121316', padding: '8px', borderRadius: '4px', border: '1px solid #1f2026' }}>
                                <div style={{ fontSize: '0.7 outer', color: '#6a6b70', fontWeight: 600 }}>ENERGY RATING</div>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{inspectedTrack.analysis?.energyScore !== undefined ? inspectedTrack.analysis.energyScore : '---'}</span>
                            </div>
                            <div style={{ background: '#121316', padding: '8px', borderRadius: '4px', border: '1px solid #1f2026' }}>
                                <div style={{ fontSize: '0.7rem', color: '#6a6b70', fontWeight: 600 }}>VIBE CLASS</div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ebb11a' }}>{inspectedTrack.analysis?.vibeProfile || '---'}</span>
                            </div>
                            <div style={{ background: '#121316', padding: '8px', borderRadius: '4px', border: '1px solid #1f2026' }}>
                                <div style={{ fontSize: '0.7rem', color: '#6a6b70', fontWeight: 600 }}>ESTIMATED DROP</div>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{inspectedTrack.analysis?.dropTime !== undefined ? `${inspectedTrack.analysis.dropTime}s` : '---'}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ color: '#4a4b50', fontSize: '0.8rem', textAlign: 'center', padding: '6px 0' }}>
                        Select a track row to view acoustic profile results.
                    </div>
                )}
            </div>
        </div>
    );
};