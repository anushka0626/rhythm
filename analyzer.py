#!/usr/bin/env python3
import sys
import json
import warnings
import os

# Suppress standard open-source telemetry warning logs to keep stdout clean for Electron JSON parsing
warnings.filterwarnings("ignore")

try:
    import librosa
    import numpy as np
except ImportError:
    print(json.dumps({"ok": False, "error": "Missing dependencies. Run: pip install librosa numpy soundfile"}))
    sys.exit(1)

def analyze_audio(file_path):
    if not os.path.exists(file_path):
        return {"ok": False, "error": f"Audio file not found at path: {file_path}"}

    try:
        # 1. Load the audio file (Force standard 22050Hz sample rate for uniform matrix analysis)
        y, sr = librosa.load(file_path, sr=22050)
        duration = librosa.get_duration(y=y, sr=sr)

        if duration == 0:
            return {"ok": False, "error": "Audio file is empty or corrupted."}

        # 2. Beat Analysis (BPM Detection)
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        # Handle librosa array types vs floats across version changes safely
        bpm = float(tempo[0]) if isinstance(tempo, (np.ndarray, list)) else float(tempo)

        # 3. Energy Scoring (Root-Mean-Square Energy Matrix)
        rms = librosa.feature.rms(y=y)[0]
        times = librosa.frames_to_time(np.arange(len(rms)), sr=sr)

        # 4. Drop Detection & Hook Calculation
        # Locate the sharpest energy jump within frames
        energy_gradients = np.diff(rms)
        max_gradient_idx = int(np.argmax(energy_gradients))
        drop_timestamp = float(times[max_gradient_idx]) if max_gradient_idx < len(times) else 0.0

        # Find the loudest window segment index block
        # Spotify previews are max 30s, but we calculate dynamically for safety
        window_size_seconds = min(30.0, duration)
        frames_per_second = len(rms) / duration
        window_size_frames = int(window_size_seconds * frames_per_second)

        if len(rms) > window_size_frames:
            # Sliding window to find the max average energy block
            window_energies = np.convolve(rms, np.ones(window_size_frames)/window_size_frames, mode='valid')
            best_start_frame = int(np.argmax(window_energies))
            hook_start = float(times[best_start_frame])
        else:
            hook_start = 0.0

        # 5. Vibe & Spectral Profile Scoring
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        mean_centroid = float(np.mean(spectral_centroids))
        max_rms = float(np.max(rms)) if len(rms) > 0 else 1.0
        mean_rms = float(np.mean(rms)) if len(rms) > 0 else 0.5
        
        # Normalize energy score between 0.0 and 1.0
        energy_score = min(1.0, max(0.0, (mean_rms / max_rms) * 1.2 if max_rms > 0 else 0.0))

        # Compute basic Vibe Embeddings profile properties (Brightness vs Deepness)
        vibe_type = "high-energy" if mean_centroid > 2500 and energy_score > 0.6 else "chill"
        if mean_centroid < 1200: vibe_type = "deep/dark"

        return {
            "ok": True,
            "analysis": {
                "bpm": round(bpm, 2),
                "duration": round(duration, 2),
                "hookStart": round(hook_start * 1000),  # Convert to milliseconds for Spotify play compatibility
                "dropTime": round(drop_timestamp, 2),
                "energyScore": round(energy_score, 2),
                "vibeProfile": vibe_type,
                "spectralCentroid": round(mean_centroid, 2)
            }
        }

    except Exception as e:
        return {"ok": False, "error": f"DSP processing failure: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "Missing file target parameter. Usage: analyzer.py <file_path>"}))
        sys.exit(1)

    target_file = sys.argv[1]
    results = analyze_audio(target_file)
    print(json.dumps(results))