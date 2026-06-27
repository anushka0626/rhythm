import React from 'react';
import { useApp } from '../App.jsx';

export const SessionControls = () => {
    const { 
        activeSessionName, 
        setActiveSessionName, 
        saveCurrentSessionAsPreset,
        savedSessions,
        loadSavedSessionProfile,
        handleExportClick,
        handleImportClick
    } = useApp();

    const historicalKeys = Object.keys(savedSessions || {});

    return (
        <div className="card session-manager" style={{ padding: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                
                {/* Session Naming Input Deck */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#aaa' }}>Orchestration Name:</label>
                    <input 
                        type="text" 
                        value={activeSessionName}
                        onChange={(e) => setActiveSessionName(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: '#181818',
                            border: '1px solid #282828',
                            borderRadius: '4px',
                            color: '#fff',
                            fontWeight: 'bold'
                        }}
                    />
                    <button className="btn-secondary" onClick={saveCurrentSessionAsPreset} style={{ cursor: 'pointer', padding: '8px 12px' }}>
                        💾 Save
                    </button>
                </div>

                {/* Portability Controls Block */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-secondary" onClick={handleImportClick} style={{ cursor: 'pointer' }}>
                        📥 Import File
                    </button>
                    <button className="btn-secondary" onClick={handleExportClick} style={{ cursor: 'pointer' }}>
                        📤 Export File
                    </button>
                </div>
            </div>

            {/* Past Profiles Quick Loader Dropdown Bar */}
            {historicalKeys.length > 0 && (
                <div style={{ marginTop: '12px', borderTop: '1px solid #222', paddingTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#888' }}>Quick Switch Session History:</span>
                    <select 
                        onChange={(e) => loadSavedSessionProfile(e.target.value)}
                        value={activeSessionName}
                        style={{
                            padding: '4px 8px',
                            backgroundColor: '#181818',
                            border: '1px solid #282828',
                            borderRadius: '4px',
                            color: '#1DB954',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="" disabled>-- Choose a saved session profile --</option>
                        {historicalKeys.map(key => (
                            <option key={key} value={key}>{key}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};