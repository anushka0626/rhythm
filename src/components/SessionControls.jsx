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
        handleImportClick,
        isConnected,
        isConnecting,
        triggerSpotifyLogin
    } = useApp();

    const historicalKeys = Object.keys(savedSessions || {});

    return (
        <div className="studio-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top Row: System Identity and Connection Bridge Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2026', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>rhythm</span>
                    <div style={{ height: '4px', width: '4px', backgroundColor: '#3a3b40', borderRadius: '50%' }}></div>
                    <span style={{ fontSize: '0.85rem', color: '#6a6b70', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Studio Node</span>
                </div>

                {/* Spotify Authentication Action Vector - Placed Natively at Header Line */}
                <div>
                    {!isConnected ? (
                        <button 
                            className="btn-studio primary" 
                            onClick={triggerSpotifyLogin} 
                            disabled={isConnecting}
                            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                        >
                            {isConnecting ? "Connecting..." : "🔌 Connect Spotify"}
                        </button>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(29, 185, 84, 0.08)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(29, 185, 84, 0.2)' }}>
                            <div style={{ height: '6px', width: '6px', backgroundColor: '#1db954', borderRadius: '50%' }}></div>
                            <span style={{ color: '#1db954', fontSize: '0.8rem', fontWeight: 600 }}>Spotify Connected</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Middle Row: Naming Inputs and Storage Actions */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
                    <input 
                        type="text" 
                        className="studio-input"
                        value={activeSessionName}
                        onChange={(e) => setActiveSessionName(e.target.value)}
                        placeholder="Name your current session..."
                        style={{ fontWeight: 600, flex: 1 }}
                    />
                    <button className="btn-studio" onClick={saveCurrentSessionAsPreset}>
                        💾 Save
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-studio" onClick={handleImportClick}>📥 Import</button>
                    <button className="btn-studio" onClick={handleExportClick}>📤 Export</button>
                </div>
            </div>

            {/* Bottom Row: Quick History Switcher Dropdown */}
            {historicalKeys.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#1a1b20', padding: '8px 12px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6a6b70', fontWeight: 600 }}>SWITCH SESSION:</span>
                    <select 
                        onChange={(e) => loadSavedSessionProfile(e.target.value)}
                        value={activeSessionName}
                        style={{
                            padding: '4px 8px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#1db954',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none',
                            fontSize: '0.85rem'
                        }}
                    >
                        <option value="" disabled>Choose past profile...</option>
                        {historicalKeys.map(key => (
                            <option key={key} value={key} style={{ backgroundColor: '#1a1b20', color: '#fff' }}>{key}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};