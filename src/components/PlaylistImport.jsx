import React, { useState } from 'react';
import { useApp } from '../App.jsx';

export const PlaylistImport = () => {
    const { setSessionQueue } = useApp();
    const [playlistInput, setPlaylistInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleImport = async (e) => {
        e.preventDefault();
        if (!playlistInput.trim()) return;

        let playlistId = playlistInput.trim();
        if (playlistId.includes('playlist/')) {
            playlistId = playlistId.split('playlist/')[1].split('?')[0];
        }

        setIsLoading(true);
        try {
            if (window.electronAPI && window.electronAPI.fetchPlaylist) {
                const response = await window.electronAPI.fetchPlaylist(playlistId);
                if (response && response.items) {
                    const parsedTracks = response.items
                        .filter(item => item && item.item)
                        .map((item, index) => {
                            const t = item.item; 
                            return {
                                id: t.id || `track-${index}`,
                                uri: t.uri,
                                name: t.name || 'Untitled Track',
                                artist: t.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
                                preview_url: t.preview_url || '', 
                                popularity: t.popularity || 50,
                                hookStart: 0,            
                                hookEnd: 30 * 1000,      
                                analysis: { bpm: 120 }    
                            };
                        });

                    setSessionQueue(parsedTracks);
                    setPlaylistInput('');
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="studio-card">
            <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#6a6b70', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🎵 Ingest Track Stream
                </h4>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                        type="text" 
                        className="studio-input"
                        placeholder="Paste public Spotify playlist link or unique ID..." 
                        value={playlistInput}
                        onChange={(e) => setPlaylistInput(e.target.value)}
                        disabled={isLoading}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn-studio primary" disabled={isLoading}>
                        {isLoading ? 'Loading...' : 'Load'}
                    </button>
                </div>
            </form>
        </div>
    );
};