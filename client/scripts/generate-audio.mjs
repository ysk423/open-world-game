// 仮のBGM・効果音をWAVファイルとして生成するワンショットスクリプト。
// 後で本物の音源に差し替える想定 (仕様書 フェーズ5)。
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_RATE = 44100;

const NOTE = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
};

function tone(freq, durationSec, { volume = 0.3, wave = "sine", attack = 0.01, release = 0.03 } = {}) {
  const n = Math.floor(durationSec * SAMPLE_RATE);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let v;
    if (wave === "sine") {
      v = Math.sin(2 * Math.PI * freq * t);
    } else if (wave === "triangle") {
      v = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * freq * t));
    } else if (wave === "square") {
      v = Math.sign(Math.sin(2 * Math.PI * freq * t));
    } else {
      v = Math.random() * 2 - 1; // noise
    }
    const attackN = Math.max(1, Math.floor(SAMPLE_RATE * attack));
    const releaseN = Math.max(1, Math.floor(SAMPLE_RATE * release));
    const envAttack = Math.min(1, i / attackN);
    const envRelease = Math.min(1, (n - i) / releaseN);
    const env = Math.min(envAttack, envRelease);
    samples[i] = v * volume * env;
  }
  return samples;
}

function concat(arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function mix(a, b) {
  const n = Math.max(a.length, b.length);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  }
  return out;
}

function floatTo16BitPCM(samples) {
  const buf = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  return buf;
}

function writeWav(filepath, samples) {
  const pcm = floatTo16BitPCM(samples);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  writeFileSync(filepath, Buffer.concat([header, pcm]));
  console.log(`written: ${filepath}`);
}

const outDir = join(__dirname, "..", "public", "assets", "audio");

// ---------- BGM: 穏やかなペンタトニックのループ ----------
const bgmNotes = [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.G5, NOTE.E5, NOTE.D5];
const bgmMelody = concat(
  bgmNotes.map((freq) => tone(freq, 0.5, { volume: 0.18, wave: "triangle", attack: 0.02, release: 0.15 })),
);
// 1オクターブ下で薄く support tone を重ねる(和音っぽさを少し出す)
const bgmBass = concat(
  [NOTE.C4, NOTE.C4, NOTE.G4, NOTE.G4, NOTE.A4, NOTE.A4, NOTE.E4, NOTE.E4].map((freq) =>
    tone(freq, 0.5, { volume: 0.08, wave: "sine", attack: 0.02, release: 0.2 }),
  ),
);
writeWav(join(outDir, "bgm.wav"), mix(bgmMelody, bgmBass));

// ---------- SFX: 採集 (軽い上昇ブリップ) ----------
const gatherSfx = concat([
  tone(NOTE.C5, 0.08, { volume: 0.35, wave: "sine", attack: 0.005, release: 0.06 }),
  tone(NOTE.E5, 0.1, { volume: 0.35, wave: "sine", attack: 0.005, release: 0.08 }),
]);
writeWav(join(outDir, "sfx-gather.wav"), gatherSfx);

// ---------- SFX: 攻撃 (短いパンチ音) ----------
const attackSfx = mix(
  tone(180, 0.12, { volume: 0.3, wave: "square", attack: 0.002, release: 0.1 }),
  tone(220, 0.12, { volume: 0.18, wave: "noise", attack: 0.002, release: 0.08 }),
);
writeWav(join(outDir, "sfx-attack.wav"), attackSfx);

// ---------- SFX: クラフト完了 (上昇アルペジオ) ----------
const craftSfx = concat([
  tone(NOTE.C5, 0.09, { volume: 0.3, wave: "triangle", attack: 0.005, release: 0.07 }),
  tone(NOTE.E5, 0.09, { volume: 0.3, wave: "triangle", attack: 0.005, release: 0.07 }),
  tone(NOTE.G5, 0.14, { volume: 0.32, wave: "triangle", attack: 0.005, release: 0.1 }),
]);
writeWav(join(outDir, "sfx-craft.wav"), craftSfx);

// ---------- SFX: NPCと話す (柔らかい単音) ----------
const talkSfx = tone(NOTE.A4, 0.12, { volume: 0.25, wave: "sine", attack: 0.01, release: 0.09 });
writeWav(join(outDir, "sfx-talk.wav"), talkSfx);

// ---------- SFX: ダメージを受けた ----------
const hurtSfx = tone(140, 0.18, { volume: 0.3, wave: "square", attack: 0.002, release: 0.15 });
writeWav(join(outDir, "sfx-hurt.wav"), hurtSfx);
