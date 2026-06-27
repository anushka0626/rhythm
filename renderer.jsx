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
            <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
                <header className="app-header" style={{ flexShrink: 0 }}>
                    <span className="logo">rhythm</span>
                    <div className="badge">Session Studio</div>
                </header>
                
                {/* Unified grid canvas layout containing balanced work columns */}
                <main className="app-container" style={{ display: 'flex', gap: '20px', flex: 1, padding: '20px', overflow: 'hidden' }}>
                    
                    {/* Left Column Stack: Queue Logistics Management */}
                    <div className="left-deck" style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
                        <SessionControls />
                        <div className="card engine-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#aaa' }}>Active Mix Queue</h3>
                            <QueueList />
                        </div>
                    </div>
                    
                    {/* Right Column Stack: Media Stream Controls */}
                    <div className="right-deck" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <PlaylistImport />
                        <div className="card engine-pane" style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#aaa' }}>Control Console</h3>
                            <PlaybackPanel />
                        </div>
                    </div>

                </main>
            </div>
        </AppProvider>
    );
}