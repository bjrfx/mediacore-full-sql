# Vosk Models Directory

This folder contains Vosk speech recognition models.

## Download Models

### Small English Model (Recommended for shared hosting)
```bash
wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip vosk-model-small-en-us-0.15.zip
mv vosk-model-small-en-us-0.15 en-us
rm vosk-model-small-en-us-0.15.zip
```

### Large English Model (Better accuracy, ~1.8 GB)
```bash
wget https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip
unzip vosk-model-en-us-0.22.zip
mv vosk-model-en-us-0.22 en-us-large
rm vosk-model-en-us-0.22.zip
```

### Hindi Model
```bash
wget https://alphacephei.com/vosk/models/vosk-model-small-hi-0.22.zip
unzip vosk-model-small-hi-0.22.zip
mv vosk-model-small-hi-0.22 hi
rm vosk-model-small-hi-0.22.zip
```

### Spanish Model
```bash
wget https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip
unzip vosk-model-small-es-0.42.zip
mv vosk-model-small-es-0.42 es
rm vosk-model-small-es-0.42.zip
```

## Available Models

See full list at: https://alphacephei.com/vosk/models

## Directory Structure After Setup

```
vosk_models/
├── en-us/           # Default English model
│   ├── am/
│   ├── conf/
│   ├── graph/
│   ├── ivector/
│   └── ...
├── hi/              # Hindi model (optional)
└── es/              # Spanish model (optional)
```

## Configuration

Set the model name in `.env`:
```
VOSK_MODEL_NAME=en-us
```

Or for Hindi:
```
VOSK_MODEL_NAME=hi
```
