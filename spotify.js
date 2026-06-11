// spotify.js
async function playTrack(accessToken, trackUri, deviceId = null,startPositionsMs=0) {
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
                //device_ids: [deviceId],
                //play:false,
                uris: [trackUri],
                position_ms: startPositionsMs
            })
        });
        
        console.log("Track URI:", trackUri);
        console.log("Device ID:", deviceId);
        //console.log("transferred playback ownership");
        console.log("\nStatus: ", response.status);
        const body=await response.text();
        console.log("resposnse : ",body);
        if (response.status === 204) {
            console.log(`▶Track command sent successfully: ${trackUri}`);
            return true;
        } else {
            console.error(`Playback rejection status: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error("Error executing playTrack:", error);
        return false;
    }
}

async function seekToPosition(accessToken, positionMs,deviceId) {
    try {
        const seekUrl =
  `https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}&device_id=${deviceId}`;
        const response = await fetch(seekUrl, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });
        console.log("Seek Status:", response.status);
        const responseText = await response.text();
        console.log("Seek Response:", responseText);

        if (response.ok) {
            console.log(`Hook Jump Successful! Warp jumped to: ${(positionMs / 1000).toFixed(2)}s`);
            return true;
        } else {
            console.error("Failed to execute position seek:", response.status);
            return false;
        }
    } catch (error) {
        console.error("Error executing seekToPosition:", error);
        return false;
    }
}

// Export both automation handlers so main.js can use them
module.exports = {
    playTrack,
    seekToPosition
};