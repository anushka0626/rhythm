// renderer.js
const button = document.querySelector("#spotifyBtn");
const status = document.querySelector("#status");

button.addEventListener("click", () => {
    status.textContent = "Opening Spotify Auth Window...";
    window.electronAPI.loginWithSpotify();
});

// Listen for the success event from the main backend process
window.electronAPI.onSpotifyConnected((data) => {
    status.innerHTML = `
        <span style="color: #1DB954; font-weight: bold;">â£ Connected to Spotify!</span>
        <br><small style="color: #888;">Session expires in ${data.expiresIn}s</small>
    `;
    button.style.display = "none"; // Hide login button once authorized
});