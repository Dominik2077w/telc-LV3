# Local Qwen3-TTS for HV1

Qwen3-TTS, its isolated Python environment, downloaded model weights, and temporary WAV files stay in `.local-tools/qwen3-tts/` and `.models/qwen3-tts/`. The Pages build copies only the finished MP3 files in `data/audio/hv1/`; it does not package this folder or these scripts.

Create the local environment in PowerShell with Python 3.10 or later and a CUDA 12.8-compatible NVIDIA driver:

```powershell
py -3.10 -m venv .local-tools\qwen3-tts\venv
$py = ".local-tools\qwen3-tts\venv\Scripts\python.exe"
& $py -m pip install --upgrade pip
& $py -m pip install torch==2.9.0 torchaudio==2.9.0 --index-url https://download.pytorch.org/whl/cu128
& $py -m pip install qwen-tts imageio-ffmpeg pypdf
& $py -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else '')"
```

Use the local environment to add transcripts from the supplied PDF or to synthesize any missing clips:

```powershell
$py = ".local-tools\qwen3-tts\venv\Scripts\python.exe"
$pdf = "C:\Users\20851\Desktop\Telc C1 HS 2026.9\Telc C1 HS 2026.9\新题（腾讯文档实时更新，笔考要看）\2026实时更新2026.9(腾讯文档实时更新）.pdf"
& $py scripts\local\qwen3-tts\import_hv1_transcripts.py $pdf
& $py scripts\local\qwen3-tts\generate_hv1_audio.py
```

Generation uses the PDF transcript when present and the PDF's matching statement otherwise. It writes mono MP3 at 24 kHz / 48 kbit/s. Existing clips are skipped; pass `--force` to regenerate them, `--part 12-2` to target one Teil, or `--limit 1` to create a small sample.

After synthesis, run `npm run build`. The static build includes only the app's explicit file list and the compressed HV1 MP3 files.
