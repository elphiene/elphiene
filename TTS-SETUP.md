# TTS Setup — elphiene blog

Generates an MP3 for each blog post and injects a `<audio>` player into the HTML. Fires automatically on commit via pre-commit hook.

---

## 1. Install deps (once)

```sh
npm install
```

---

## 2. Set env vars

Add to your `~/.zshrc` (or `.bashrc`):

```sh
export TTS_PROVIDER="elevenlabs"        # or "openai"
export TTS_API_KEY="your-api-key"
export VOICE_ID="your-voice-id"         # see Voice Options below
```

Then `source ~/.zshrc`.

---

## 3. Get an API key

**ElevenLabs** — https://elevenlabs.io
- Free tier: 10,000 chars/month (~5–8 blog posts)
- API key: Profile → API Key

**OpenAI** — https://platform.openai.com
- Pay-as-you-go: ~$0.015 per 1,000 chars (a typical post costs < $0.10)
- API key: Dashboard → API Keys

---

## 4. Voice options

### ElevenLabs
Browse and preview the full library at **https://elevenlabs.io/voice-library**.

To get a voice ID: open a voice in the library → the ID is in the URL, or shown under the voice name. Set `VOICE_ID` to that string (e.g. `21m00Tcm4TlvDq8ikWAM`).

You can also clone your own voice (requires ~1 min of clean audio) under **VoiceLab → Add Generative Voice → Voice Design** or **Instant Voice Cloning**.

Notable pre-made voices (as of mid-2025):
| Name | Character |
|---|---|
| Rachel | calm, neutral female |
| Domi | confident, young female |
| Bella | soft, warm female |
| Antoni | well-rounded male |
| Josh | deep, American male |
| Elli | expressive, young female |
| Adam | narration, deep male |

### OpenAI
Six fixed voices — no browsing needed, just set `VOICE_ID` to one of:

| Voice | Character |
|---|---|
| `alloy` | neutral, versatile |
| `echo` | slightly deeper male |
| `fable` | warm, British |
| `onyx` | deep, authoritative male |
| `nova` | bright, young female |
| `shimmer` | soft, gentle female |

Preview them at **https://platform.openai.com/docs/guides/text-to-speech**.

---

## 5. Workflow

**Normal:** just commit a `blog-*.html` as usual. The hook runs automatically, generates the MP3, injects the player, and stages both.

**Manual (outside a commit):**
```sh
npm run tts -- blog-may-25-2026.html          # generate + inject player
npm run tts -- blog-may-25-2026.html --force  # regen even if MP3 exists
```

**Skip TTS on a commit:** unset the key temporarily:
```sh
TTS_API_KEY="" git commit -m "..."
```

---

## 6. File layout

```
audio/
  blog-may-25-2026.mp3    # gitignored but force-added by hook
  blog-jun-1-2026.mp3
scripts/
  gen-tts.js              # the generation script
```

MP3s are gitignored to prevent accidental `git add .` bloat. The hook uses `git add -f` to stage them explicitly.
