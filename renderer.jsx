// renderer.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { AppProvider } from "./src/App.jsx"; 
import { QueueList } from "./src/components/QueueList.jsx";
import { PlaybackPanel } from "./src/components/PlaybackPanel.jsx";
import { PlaylistImport } from "./src/components/PlaylistImport.jsx"; 
import { SessionControls } from "./src/components/SessionControls.jsx";

const rootElement = document.getElementById('root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <AppProvider>
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '30px 20px' }}>
                
                {/* Clean Studio Global Header Control Bar */}
                <SessionControls />
                
                {/* Two-Column Structured Studio Workspace */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', marginTop: '24px', alignItems: 'start' }}>
                    
                    {/* Left Workplane Deck: Interactive Sequence Queue */}
                    <div className="studio-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.3px' }}>Active Mix Queue</h3>
                            <span style={{ fontSize: '0.8rem', color: '#6a6b70', fontWeight: 500 }}>Sequence Stack</span>
                        </div>
                        <QueueList />
                    </div>
                    
                    {/* Right Workplane Deck: Ingestion Bar & Core Playback Control Deck */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <PlaylistImport /> 
                        <PlaybackPanel />
                    </div>

                </div>
            </div>
        </AppProvider>
    );
}