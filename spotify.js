// spotify.js
async function playTrack(accessToken, trackUri, deviceId = null, startPositionMs = 0) {
    try {
        let playUrl = "https://api.spotify.com/v1/me/player/play";

        if (deviceId) {
            playUrl += `?device_id=${deviceId}`;
        }

        const response = await fetch(playUrl, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                uris: [trackUri],
                position_ms: startPositionMs
            })
        });

        console.log("Track URI:", trackUri);
        console.log("Device ID:", deviceId);
        console.log("Status:", response.status);

        const body = await response.text();
        console.log("response:", body);

        if (response.status === 204) {
            console.log(`Track command sent successfully: ${trackUri}`);
            return true;
        }

        console.error(`Playback rejection status: ${response.status}`);
        return false;
    } catch (error) {
        console.error("Error executing playTrack:", error);
        return false;
    }
}

async function pausePlayback(accessToken, deviceId = null) {
    try {
        let pauseUrl = "https://api.spotify.com/v1/me/player/pause";

        if (deviceId) {
            pauseUrl += `?device_id=${deviceId}`;
        }

        const response = await fetch(pauseUrl, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        console.log("Pause Status:", response.status);
        return response.ok || response.status === 204;
    } catch (error) {
        console.error("Error executing pausePlayback:", error);
        return false;
    }
}

async function seekToPosition(accessToken, positionMs, deviceId) {
    try {
        const seekUrl = `https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}&device_id=${deviceId}`;
        const response = await fetch(seekUrl, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        console.log("Seek Status:", response.status);

        const responseText = await response.text();
        console.log("Seek Response:", responseText);

        if (response.ok) {
            console.log(`Hook jump successful: ${(positionMs / 1000).toFixed(2)}s`);
            return true;
        }

        console.error("Failed to execute position seek:", response.status);
        return false;
    } catch (error) {
        console.error("Error executing seekToPosition:", error);
        return false;
    }
}

async function getPlaylistTracks(accessToken, playlistId) {
    const items = [];
    let url = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100`;

    console.log("Playlist ID:", playlistId);
    console.log("Token exists:", !!accessToken);

    while (url) {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        console.log("Playlist status:", response.status);

        const text = await response.text();
        console.log("playlist response:", text);

        if (!text) {
            return null;
        }

        const page = JSON.parse(text);

        if (!response.ok) {
            const error = new Error(`Spotify playlist request failed with ${response.status}`);
            error.status = response.status;
            error.body = page;
            throw error;
        }

        items.push(...(Array.isArray(page.items) ? page.items : []));
        url = page.next || null;
    }

    return { items };
}

async function getAudioFeatures(accessToken, trackIds) {
    const ids = [...new Set((trackIds || []).filter(Boolean))];
    const audioFeatures = [];

    for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const url = `https://api.spotify.com/v1/audio-features?ids=${encodeURIComponent(batch.join(","))}`;
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const text = await response.text();

        if (!response.ok) {
            const error = new Error(`Spotify audio features request failed with ${response.status}`);
            error.status = response.status;
            error.body = text;
            throw error;
        }

        const data = text ? JSON.parse(text) : {};
        audioFeatures.push(...(Array.isArray(data.audio_features) ? data.audio_features : []));
    }

    return audioFeatures;
}

async function getArtists(accessToken, artistIds) {
    const ids = [...new Set((artistIds || []).filter(Boolean))];
    const artists = [];

    for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        const url = `https://api.spotify.com/v1/artists?ids=${encodeURIComponent(batch.join(","))}`;
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const text = await response.text();

        if (!response.ok) {
            const error = new Error(`Spotify artist metadata request failed with ${response.status}`);
            error.status = response.status;
            error.body = text;
            throw error;
        }

        const data = text ? JSON.parse(text) : {};
        artists.push(...(Array.isArray(data.artists) ? data.artists : []));
    }

    return artists;
}

async function getAudioAnalysis(accessToken, trackId) {
    try{
        const url= `https://api.spotify.com/v1/audio-analysis/${trackId}`;
        const response= await fetch(url,{
            headers: {Authorization: `Bearer ${accessToken}`}
        });
        if(!response.ok){
            throw new Error(`Spotify audio analysis failed with status ${response.status}`);
        }
        const text=await response.text();
        return text ? JSON.parse(text) : null;
    } catch(error){
        console.error("error executing getAudioAnalysis: ", error);
        throw error;
    }
};
module.exports = {
    playTrack,
    pausePlayback,
    seekToPosition,
    getPlaylistTracks,
    getAudioFeatures,
    getArtists,
    getAudioAnalysis
};
