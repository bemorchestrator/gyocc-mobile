import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";

const PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

let audioContext: AudioContext | null = null;
let player: AudioPlayer | null = null;
let modeReady: Promise<void> | null = null;
const fileCache = new Map<string, string>();

export function frequencyFor(note: string) {
  const match = /^([A-G]#?)(\d)$/.exec(note);
  if (!match) return 440;
  const midi = (Number(match[2]) + 1) * 12 + PITCH_NAMES.indexOf(match[1]);
  return 440 * 2 ** ((midi - 69) / 12);
}

function wavBase64(frequency: number) {
  const sampleRate = 22050;
  const count = Math.floor(sampleRate * 0.7);
  const dataSize = count * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  for (let index = 0; index < count; index += 1) {
    const time = index / sampleRate;
    const envelope = Math.min(1, index / 180) * Math.exp(-3.4 * time);
    const sample = Math.sin(2 * Math.PI * frequency * time) * envelope * 0.34;
    view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 32767, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 4096) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 4096));
  }
  return btoa(binary);
}

function playOnWeb(frequency: number) {
  const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  if (!audioContext) audioContext = new Context();
  if (audioContext.state === "suspended") void audioContext.resume();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;
  const now = audioContext.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 1.1);
}

async function playOnNative(note: string, frequency: number) {
  if (!modeReady) {
    modeReady = setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" }).then(() => undefined);
  }
  await modeReady;
  let uri = fileCache.get(note);
  if (!uri) {
    if (!FileSystem.cacheDirectory) return;
    uri = `${FileSystem.cacheDirectory}notation-${note.replace("#", "s")}.wav`;
    await FileSystem.writeAsStringAsync(uri, wavBase64(frequency), { encoding: "base64" });
    fileCache.set(note, uri);
  }
  if (!player) player = createAudioPlayer(uri);
  else player.replace(uri);
  await player.seekTo(0);
  player.play();
}

export function playNote(note: string) {
  const frequency = frequencyFor(note);
  if (Platform.OS === "web") {
    playOnWeb(frequency);
    return;
  }
  void playOnNative(note, frequency).catch(() => undefined);
}
