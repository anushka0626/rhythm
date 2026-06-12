// renderer.js
const button = document.querySelector("#spotifyBtn");
const status = document.querySelector("#status");
const playlistBtn=document.querySelector("#loadPlaylistBtn");
//const queueBtn=document.querySelector("#queueBtn");
let hookDb={};

let sessionQueue=[];
const saved =
    localStorage.getItem("hookDb");
if (saved) {
    hookDb = JSON.parse(saved);
}

button.addEventListener("click", () => {
    status.textContent = "Opening Spotify Auth Window...";
    window.electronAPI.loginWithSpotify();
});

playlistBtn.addEventListener(
    "click",async () => {
        const playlistId =document.querySelector("#playlistInput").value;
        const data =await window.electronAPI.fetchPlaylist(playlistId);
        const songs = data.items.map(entry => ({
            name: entry.item.name,
            artist: entry.item.artists[0].name,
            uri: entry.item.uri
        }));

        console.log("Songs:", songs);

        const songList =document.querySelector("#songList");
        songList.innerHTML = "";
        songs.forEach(song => {
            const li = document.createElement("li");
            const title=document.createElement("span");
            title.textContent=`${song.name}-${song.artist}`;
            const playBtn=document.createElement("button");
            
            const hookStart=document.createElement("input");
            hookStart.type="number";
            hookStart.placeholder= "Hook (sec)"
            //hookStart.value=60000;
            hookStart.style.width="80px";
            //hookStart.value=hookDb[song.uri] ? hookDb[song.uri]/1000:60;
            //hookDb[song.uri]=Number(hookStart.value)*1000;
            
            //taking ending also as input
            const hookEnd=document.createElement("input");
            hookEnd.type="number";
            hookEnd.placeholder= "End (sec)";
            hookEnd.style.width='80px';
            //hookEnd.value=hookDb[song.uri] ? hookDb[song.uri]/1000:60;
            //hookDb[song.uri]=Number(hookEnd.value)*1000;
            
            const saveHook=hookDb[song.uri];
            hookStart.value=saveHook? saveHook.start/1000:60;
            hookEnd.value=saveHook?saveHook.end/1000:60;

            playBtn.textContent = "	▶";
            playBtn.addEventListener(
                "click",async () => {
                    hookDb[song.uri]={
                        start:Number(hookStart.value) * 1000,
                        end: Number(hookEnd.value)*1000};
                    localStorage.setItem("hookDb",JSON.stringify(hookDb));
                    await window.electronAPI.playHook(
                        song.uri,
                        Number(hookStart.value)*1000
                    );
                }
            );

            const queueBtn=document.createElement("button");
            queueBtn.textContent="+ queue";

            queueBtn.addEventListener("click", ()=>{
                if(sessionQueue.some(track=>track.uri===song.uri)){return;}
                sessionQueue.push({
                    uri:song.uri, name: song.name, hookStart: Number(hookStart.value)*1000,
                    hookEnd: Number(hookEnd.value)*1000
                });
                renderQueue();
                console.log(sessionQueue);
            })

            li.appendChild(title);
            li.appendChild(hookStart);
            li.appendChild(hookEnd);
            li.appendChild(playBtn);
            li.appendChild(queueBtn);
            //li.textContent=`${song.name} — ${song.artist}`;
            songList.appendChild(li);
        });  
    }
);


function renderQueue() {
    const queueList =document.querySelector("#queueList");

    queueList.innerHTML = "";
    sessionQueue.forEach(track => {
        const li=document.createElement("li");
        li.textContent =`${track.name} (${track.hookStart/1000}s → ${track.hookEnd/1000}s)`;
        queueList.appendChild(li);
    });
}


document
    .querySelector("#startSessionBtn")
    .addEventListener(
        "click",async () => {
            console.log("Starting session...");

            for (const track of sessionQueue) {

                console.log(`Playing ${track.name}`);

                await window.electronAPI.playHook(
                    track.uri,
                    track.hookStart
                );

                const duration =track.hookEnd -track.hookStart;

                console.log(`Waiting ${duration / 1000} seconds`);

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            duration
                        )
                );
            }

            console.log(
                "Session complete."
            );
        }
    );


window.electronAPI.onSpotifyConnected((data) => {
    status.innerHTML = `
        <span style="color: #1DB954; font-weight: bold;">â£ Connected to Spotify!</span>
        <br><small style="color: #888;">Session expires in ${data.expiresIn}s</small>
    `;
    button.style.display = "none"; // Hide login button once authorized
});