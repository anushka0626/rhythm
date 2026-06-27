import React from 'react';
import { useApp } from '../App';

export const QueueList = () => {
    const { 
        sessionQueue, 
        setSessionQueue,
        selectedQueueIndex, 
        setSelectedQueueIndex, 
        playback,
        moveTrackUp,
        moveTrackDown
    } = useApp();

    const removeItem = (index, e) => {
        e.stopPropagation();
        if (playback.running && index === playback.currentIndex) return;
        
        const newQueue = [...sessionQueue];
        newQueue.splice(index, 1);
        setSessionQueue(newQueue);
        setSelectedQueueIndex(newQueue.length ? Math.min(index, newQueue.length - 1) : null);
    };

    // Safely handles inline numeric user edits for individual track milestones
    const updateTrackTimeField = (index, field, secondsValue) => {
        const msValue = Math.max(0, Number(secondsValue) * 1000);
        const updatedQueue = [...sessionQueue];
        
        if (field === 'start') {
            updatedQueue[index].hookStart = msValue;
            // Maintain minimum logical bound safety
            if (updatedQueue[index].hookEnd <= msValue) {
                updatedQueue[index].hookEnd = msValue + (30 * 1000);
            }
        } else {
            updatedQueue[index].hookEnd = Math.max(msValue, updatedQueue[index].hookStart + 1000);
        }
        
        setSessionQueue(updatedQueue);
    };

    if (!sessionQueue || !sessionQueue.length) {
        return <div className="empty-state" style={{ padding: '40px 20px', color: '#666', textAlign: 'center', border: '1px dashed #282828', borderRadius: '6px' }}>No tracks currently loaded into this session workspace.</div>;
    }

    return (
        <ul className="scrollable-list queue-list" style={{ padding: 0, margin: 0, listStyle: 'none', maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sessionQueue.map((track, index) => {
                const isSelected = index === selectedQueueIndex;
                const isCurrent = playback.running && index === playback.currentIndex;
                
                let rowBg = '#181818';
                if (isSelected) rowBg = '#222';
                if (isCurrent) rowBg = '#192b1f';

                return (
                    <li 
                        key={`${track.uri}-${index}`} 
                        onClick={() => setSelectedQueueIndex(index)}
                        style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '12px',
                            padding: '15px', 
                            backgroundColor: rowBg,
                            borderRadius: '6px',
                            border: isCurrent ? '1px solid #1DB954' : '1px solid #282828',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease'
                        }}
                    >
                        {/* Upper Section: Core Track Information Data */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div className="track-info" style={{ flex: 1, paddingRight: '10px' }}>
                                <span className="track-title" style={{ display: 'block', fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>
                                    {track.name}
                                </span>
                                <span className="track-detail" style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginTop: '2px' }}>
                                    {track.artist || 'Unknown'} • Popularity {Math.round(track.popularity || 50)}
                                </span>
                            </div>
                            
                            <div className="track-actions queue-actions" style={{ display: 'flex', gap: '4px' }}>
                                <button className="btn-action" onClick={(e) => { e.stopPropagation(); moveTrackUp(index); }} disabled={index === 0} style={{ padding: '4px 8px', background: '#282828', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>▲</button>
                                <button className="btn-action" onClick={(e) => { e.stopPropagation(); moveTrackDown(index); }} disabled={index === sessionQueue.length - 1} style={{ padding: '4px 8px', background: '#282828', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>▼</button>
                                <button className="btn-action" onClick={(e) => removeItem(index, e)} style={{ padding: '4px 8px', background: '#da3737', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '5px' }}>✕</button>
                            </div>
                        </div>

                        {/* Lower Section: Manual Hook Custom Parameter Modifiers */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#121212', padding: '8px 12px', borderRadius: '4px' }} onClick={(e) => e.stopPropagation()}>
                            <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>🎛️ Manual Window:</span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Start:</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={Math.round(track.hookStart / 1000)}
                                    onChange={(e) => updateTrackTimeField(index, 'start', e.target.value)}
                                    style={{ width: '55px', padding: '4px', backgroundColor: '#222', border: '1px solid #333', borderRadius: '3px', color: '#1DB954', fontWeight: 'bold', textAlign: 'center' }}
                                />
                                <span style={{ fontSize: '0.8rem', color: '#666' }}>s</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#aaa' }}>End:</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={Math.round(track.hookEnd / 1000)}
                                    onChange={(e) => updateTrackTimeField(index, 'end', e.target.value)}
                                    style={{ width: '55px', padding: '4px', backgroundColor: '#222', border: '1px solid #333', borderRadius: '3px', color: '#1DB954', fontWeight: 'bold', textAlign: 'center' }}
                                />
                                <span style={{ fontSize: '0.8rem', color: '#666' }}>s</span>
                            </div>

                            <span style={{ fontSize: '0.75rem', color: '#555', marginLeft: 'auto' }}>
                                Length: {Math.round((track.hookEnd - track.hookStart) / 1000)}s
                            </span>
                        </div>

                    </li>
                );
            })}
        </ul>
    );
};