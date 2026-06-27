import React, { useState } from 'react';
import { useApp } from '../App.jsx';

export const PlaylistImport = () => {
    const { setSessionQueue } = useApp();
    const [playlistInput, setPlaylistInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [statusText, setStatusText] = useState('');

    const handleImport = async (e) => {
        e.preventDefault();
        if (!playlistInput.trim()) return;

        let playlistId = playlistInput.trim();
        if (playlistId.includes('playlist/')) {
            playlistId = playlistId.split('playlist/')[1].split('?')[0];
        }

        setIsLoading(true);
        setStatusText('Fetching playlist tracks from Spotify...');
        
        try {
            if (window.electronAPI && window.electronAPI.fetchPlaylist) {
                const response = await window.electronAPI.fetchPlaylist(playlistId);
                
                if (response && response.items) {
                    setStatusText('Extracting audio features (BPM, metadata)...');
                    
                    // 1. Initial base mapping of tracks
                    const baseTracks = response.items
                        .filter(item => item && item.item)
                        .map((item, index) => {
                            const t = item.item; 
                            return {
                                id: t.id || `track-${index}`,
                                uri: t.uri,
                                name: t.name || 'Untitled Track',
                                artist: t.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
                                artistIds: t.artists?.map(a => a.id) || [],
                                preview_url: t.preview_url || '', 
                                popularity: t.popularity || 50,
                                hookStart: 0,            
                                hookEnd: 30 * 1000,      
                                analysis: { bpm: 120 } // Fallback placeholder baseline
                            };
                        });

                    // 2. Automated Deep Feature Pull Step
                    const trackIds = baseTracks.map(track => track.id).filter(Boolean);
                    
                    if (trackIds.length > 0 && window.electronAPI.analyzeTracks) {
                        // Request audio features (BPM, danceability, etc.) from Spotify API via backend
                        const analysisResult = await window.electronAPI.analyzeTracks({ trackIds });
                        
                        if (analysisResult && analysisResult.features) {
                            // Create a quick-lookup map for features by track ID
                            const featureMap = {};
                            analysisResult.features.forEach(feat => {
                                if (feat && feat.id) featureMap[feat.id] = feat;
                            });

                            // Enrich the baseline tracks with real metrics from Spotify
                            const enrichedTracks = baseTracks.map(track => {
                                const trackFeatures = featureMap[track.id];
                                return {
                                    ...track,
                                    analysis: {
                                        bpm: trackFeatures ? trackFeatures.tempo : 120,
                                        energy: trackFeatures ? trackFeatures.energy : 0.5,
                                        valence: trackFeatures ? trackFeatures.valence : 0.5,
                                        key: trackFeatures ? trackFeatures.key : -1
                                    }
                                };
                            });

                            setSessionQueue(enrichedTracks);
                            setStatusText('');
                            setPlaylistInput('');
                            return;
                        }
                    }

                    // Fallback to base tracks if audio analysis fails
                    setSessionQueue(baseTracks);
                    setStatusText('');
                    setPlaylistInput('');
                } else {
                    alert('Could not fetch playlist layout data.');
                    setStatusText('');
                }
            }
        } catch (error) {
            console.error('Failed to parse track matrix stream:', error);
            alert('Error loading playlist contents.');
            setStatusText('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card playlist-import-bar" style={{ marginBottom: '20px', padding: '15px' }}>
            <form onSubmit={handleImport} style={{ display: 'flex', gap: '10px' }}>
                <input 
                    type="text" 
                    placeholder="Paste Spotify Playlist Link or ID here..." 
                    value={playlistInput}
                    onChange={(e) => setPlaylistInput(e.target.value)}
                    disabled={isLoading}
                    style={{
                        flex: 1,
                        padding: '10px',
                        backgroundColor: '#181818',
                        border: '1px solid #282828',
                        borderRadius: '4px',
                        color: '#fff',
                        outline: 'none'
                    }}
                />
                <button 
                    type="submit" 
                    className="btn-session"
                    disabled={isLoading}
                    style={{ minWidth: '120px', cursor: 'pointer' }}
                >
                    {isLoading ? 'Loading...' : '⚡ Load Tracks'}
                </button>
            </form>
            {statusText && (
                <div style={{ marginTop: '8px', color: '#1DB954', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {statusText}
                </div>
            )}
        </div>
    );
};