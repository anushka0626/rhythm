import sys
import json
import urllib.request
import tempfile
import os

try:
    import librosa
    import numpy as np
except ImportError:
    print(json.dumps({"ok": False, "error": "Missing librosa or numpy. Run: pip install librosa numpy"}))
    sys.exit(0)

def find_peak_moment(url):
    try:
        # 1. Stream the 30-second preview track into a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_mp3:
            urllib.request.urlretrieve(url, temp_mp3.name)
            temp_path = temp_mp3.name

        # 2. Load the audio array slice
        y, sr = librosa.load(temp_path, duration=30)
        
        # 3. Compute frame-by-frame short-time energy (RMS)
        rms = librosa.feature.rms(y=y)[0]
        
        # 4. Find the max energy window frame and map it to milliseconds
        max_frame = np.argmax(rms)
        peak_time_seconds = librosa.frames_to_time(max_frame, sr=sr)
        peak_ms = int(peak_time_seconds * 1000)

        # Clean up the disk footprint
        os.unlink(temp_path)
        
        return {"ok": True, "hookStart": peak_ms}
    except Exception as e:
        return {"ok": False, "error": str(e)}

if __name__ == "__main__":
    # Expects the preview URL passed as a clean command-line argument
    if len(sys.argv) > 1:
        target_url = sys.argv[1]
        result = find_peak_moment(target_url)
        print(json.dumps(result))
    else:
        print(json.dumps({"ok": False, "error": "No target audio URL provided."}))