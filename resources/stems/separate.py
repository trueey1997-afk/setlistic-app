"""Splits one song into 6 stems with Demucs (htdemucs_6s).

Usage: python separate.py <input.wav> <output dir>

Reads and writes audio with soundfile instead of torchaudio, whose load/save need extra
codecs in recent versions. Progress goes to stderr (tqdm "NN%|"), one "SAVED <stem>" line
per file to stdout. The input must already be 44.1 kHz (yt-dlp converts it).
"""

import os
import sys

import numpy as np
import soundfile as sf
import torch
from demucs.apply import apply_model
from demucs.pretrained import get_model

MODEL = "htdemucs_6s"


def main() -> None:
    src, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)

    model = get_model(MODEL)
    model.eval()

    audio, rate = sf.read(src, dtype="float32", always_2d=True)  # (frames, channels)
    if rate != model.samplerate:
        sys.exit(f"sample rate {rate} != {model.samplerate}")
    wav = torch.from_numpy(np.ascontiguousarray(audio.T))
    if wav.shape[0] == 1:
        wav = wav.repeat(2, 1)
    wav = wav[:2]

    # Same normalisation as the demucs CLI
    ref = wav.mean(0)
    mean, std = ref.mean(), ref.std() + 1e-8
    wav = (wav - mean) / std

    device = "cuda" if torch.cuda.is_available() else "cpu"
    with torch.no_grad():
        sources = apply_model(
            model, wav[None], device=device, split=True, overlap=0.25, progress=True
        )[0]
    sources = sources * std + mean

    for name, source in zip(model.sources, sources):
        data = np.clip(source.cpu().numpy().T, -1.0, 1.0)
        sf.write(os.path.join(out_dir, f"{name}.flac"), data, model.samplerate, subtype="PCM_16")
        print(f"SAVED {name}", flush=True)


if __name__ == "__main__":
    main()
