#!/usr/bin/env node
/**
 * gen-tts.js — generate TTS audio for a blog post and inject an <audio> player.
 *
 * Usage:
 *   node scripts/gen-tts.js blog-may-25-2026.html [--force]
 *   npm run tts -- blog-may-25-2026.html
 *
 * Required env vars:
 *   TTS_API_KEY   — API key for chosen provider
 *   TTS_PROVIDER  — 'elevenlabs' (default) or 'openai'
 *   VOICE_ID      — ElevenLabs voice ID, or OpenAI voice name (alloy, echo, fable, onyx, nova, shimmer)
 *
 * Output:
 *   audio/<slug>.mp3          — generated audio file (committed to repo)
 *   <blog-file>.html          — updated in-place with <audio> player injected
 */

const fs   = require('fs');
const path = require('path');
const { load } = require('cheerio');

// ── config ──────────────────────────────────────────────────────────────────
const PROVIDER = (process.env.TTS_PROVIDER || 'elevenlabs').toLowerCase();
const API_KEY  = process.env.TTS_API_KEY;
const VOICE_ID = process.env.VOICE_ID || (PROVIDER === 'openai' ? 'nova' : null);
const FORCE    = process.argv.includes('--force');

const htmlArg = process.argv.slice(2).find(a => a.endsWith('.html'));
if (!htmlArg) {
  console.error('Usage: node scripts/gen-tts.js <blog-*.html> [--force]');
  process.exit(1);
}
if (!API_KEY) {
  console.error('[tts] TTS_API_KEY is not set');
  process.exit(1);
}
if (!VOICE_ID) {
  console.error('[tts] VOICE_ID is not set');
  process.exit(1);
}

// Resolve path relative to repo root (works whether called from root or scripts/)
const repoRoot  = path.resolve(__dirname, '..');
const htmlPath  = path.resolve(repoRoot, htmlArg);
const slug      = path.basename(htmlPath, '.html');
const audioDir  = path.join(repoRoot, 'audio');
const audioFile = path.join(audioDir, `${slug}.mp3`);
const audioSrc  = `audio/${slug}.mp3`; // relative path used in HTML

// ── helpers ──────────────────────────────────────────────────────────────────
function extractText(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const $    = load(html);
  return $('.blog-post-text').text().replace(/\s+/g, ' ').trim();
}

async function fetchTTS(text) {
  if (PROVIDER === 'elevenlabs') {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key':   API_KEY,
        'Content-Type': 'application/json',
        'Accept':       'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
    return Buffer.from(await res.arrayBuffer());
  }

  if (PROVIDER === 'openai') {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ model: 'tts-1', voice: VOICE_ID, input: text }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    return Buffer.from(await res.arrayBuffer());
  }

  throw new Error(`Unknown TTS_PROVIDER "${PROVIDER}" — use 'elevenlabs' or 'openai'`);
}

function injectPlayer(htmlPath, audioSrc) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const $    = load(html, { decodeEntities: false });

  // Idempotent — remove any existing player before re-inserting
  $('.tts-player').remove();

  $('.blog-post-title-bar').after(
    '\n        <div class="tts-player">' +
    `\n            <span>listen:</span>` +
    `\n            <audio controls src="${audioSrc}">your browser does not support audio.</audio>` +
    '\n        </div>'
  );

  fs.writeFileSync(htmlPath, $.html());
}

// ── main ─────────────────────────────────────────────────────────────────────
(async () => {
  if (!FORCE && fs.existsSync(audioFile)) {
    console.log(`[tts] ${slug}: already exists — skipping (use --force to regen)`);
    process.exit(0);
  }

  console.log(`[tts] ${slug}: extracting text...`);
  const text = extractText(htmlPath);
  if (!text) {
    console.error(`[tts] ${slug}: .blog-post-text is empty`);
    process.exit(1);
  }
  console.log(`[tts] ${slug}: ${text.length} chars → ${PROVIDER} (voice: ${VOICE_ID})`);

  const audio = await fetchTTS(text);

  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);
  fs.writeFileSync(audioFile, audio);
  console.log(`[tts] ${slug}: saved ${audioFile}`);

  injectPlayer(htmlPath, audioSrc);
  console.log(`[tts] ${slug}: audio player injected into ${path.basename(htmlPath)}`);
})().catch(e => {
  console.error(`[tts] error: ${e.message}`);
  process.exit(1);
});
