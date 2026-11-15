import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Ellipse, Line, Text as SvgText } from "react-native-svg";
import { font } from "../constants/fonts";
import { playNote } from "../utils/playTone";

const INK = "#111527";
const MAROON = "#840016";
const MUTED = "#587284";
const DIM = "#8A7E78";
const PAPER = "#F4F5F0";
const WHITE = "#FFFFFF";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const SHARP_OF: Record<string, string> = { C: "C#", D: "D#", F: "F#", G: "G#", A: "A#" };
const OCTAVES = [4, 5];
const KEYBOARD_WIDTH = 560;
const WHITE_KEY_WIDTH = KEYBOARD_WIDTH / (LETTERS.length * OCTAVES.length);

type WhiteKey = { note: string; index: number };
type BlackKey = { note: string; whiteIndex: number };

function buildKeys() {
  const white: WhiteKey[] = [];
  const black: BlackKey[] = [];
  OCTAVES.forEach((octave) => {
    LETTERS.forEach((letter) => {
      const index = white.length;
      white.push({ note: `${letter}${octave}`, index });
      const sharp = SHARP_OF[letter];
      if (sharp) black.push({ note: `${sharp}${octave}`, whiteIndex: index });
    });
  });
  return { white, black };
}

const KEYS = buildKeys();
const STEP: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

function noteParts(note: string) {
  const sharp = note.includes("#");
  const letter = note[0];
  const octave = Number(note.slice(-1));
  const step = STEP[letter] + (octave - 4) * 7;
  return { sharp, letter, octave, step };
}

function noteLabel(note: string) {
  const { sharp, letter, octave } = noteParts(note);
  return `${letter}${sharp ? "♯" : ""}${octave}`;
}

function Staff({ note }: { note: string | null }) {
  const placed = note ? noteParts(note) : null;
  const yFor = (step: number) => 118 - (step - 2) * 11;
  const noteY = placed ? yFor(placed.step) : 0;
  const stemUp = placed ? placed.step < 6 : true;

  return (
    <View style={styles.staffCard}>
      <Svg width="100%" height={168} viewBox="0 0 320 168">
        <SvgText x={8} y={108} fontSize={62} fill={MAROON}>𝄞</SvgText>
        {[2, 4, 6, 8, 10].map((step) => (
          <Line key={step} x1={8} y1={yFor(step)} x2={308} y2={yFor(step)} stroke="#C9C3BC" strokeWidth={1} />
        ))}
        {placed && (placed.step <= 0 || placed.step >= 12) ? (
          <Line x1={138} y1={yFor(placed.step <= 0 ? 0 : 12)} x2={182} y2={yFor(placed.step <= 0 ? 0 : 12)} stroke="#C9C3BC" strokeWidth={1} />
        ) : null}
        {placed ? (
          <>
            {placed.sharp ? <SvgText x={128} y={noteY + 6} fontSize={18} fill={INK}>♯</SvgText> : null}
            <Ellipse cx={164} cy={noteY} rx={9} ry={6.5} fill={INK} transform={`rotate(-18 164 ${noteY})`} />
            <Line
              x1={stemUp ? 172 : 156}
              y1={noteY}
              x2={stemUp ? 172 : 156}
              y2={stemUp ? noteY - 38 : noteY + 38}
              stroke={INK}
              strokeWidth={1.7}
            />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

function PianoKeyIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Line x1={3} y1={6} x2={21} y2={6} stroke={color} strokeWidth={1.6} />
      <Line x1={3} y1={19} x2={21} y2={19} stroke={color} strokeWidth={1.6} />
      <Line x1={3} y1={6} x2={3} y2={19} stroke={color} strokeWidth={1.6} />
      <Line x1={21} y1={6} x2={21} y2={19} stroke={color} strokeWidth={1.6} />
      <Line x1={8} y1={6} x2={8} y2={19} stroke={color} strokeWidth={1.2} />
      <Line x1={13} y1={6} x2={13} y2={19} stroke={color} strokeWidth={1.2} />
      <Line x1={18} y1={6} x2={18} y2={19} stroke={color} strokeWidth={1.2} />
      <Line x1={6.2} y1={6} x2={6.2} y2={13} stroke={color} strokeWidth={2.4} />
      <Line x1={11.2} y1={6} x2={11.2} y2={13} stroke={color} strokeWidth={2.4} />
      <Line x1={16.2} y1={6} x2={16.2} y2={13} stroke={color} strokeWidth={2.4} />
    </Svg>
  );
}

export function NotationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [played, setPlayed] = useState<string | null>(null);
  const keyboardBottom = Math.max(insets.bottom, 8) + 78;

  const pressKey = (note: string) => {
    setPlayed(note);
    setActive(note);
    playNote(note);
    setTimeout(() => setActive((current) => (current === note ? null : current)), 180);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: open ? 300 : 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" style={styles.iconButton} onPress={() => navigation.navigate("Home")}>
            <Ionicons name="arrow-back" size={20} color={INK} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Notation</Text>
            <Text style={styles.subtitle}>TREBLE STAFF</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={open ? "Close piano keyboard" : "Open piano keyboard"}
            accessibilityState={{ expanded: open }}
            style={[styles.iconButton, open && styles.iconButtonOn]}
            onPress={() => setOpen((current) => !current)}
          >
            <PianoKeyIcon color={open ? WHITE : MAROON} />
          </Pressable>
        </View>

        <Staff note={played} />
        <Text style={styles.played}>{played ? noteLabel(played) : "Open the keyboard and play a note."}</Text>
      </ScrollView>

      {open ? (
        <View style={[styles.keyboard, { bottom: keyboardBottom }]}>
          <View style={styles.handle} />
          <View style={styles.keyboardHeader}>
            <Text style={styles.keyboardNote}>{played ? noteLabel(played) : "Play a key to hear it"}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close piano keyboard" hitSlop={8} onPress={() => setOpen(false)}>
              <Ionicons name="chevron-down" size={22} color={DIM} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.keys}>
              {KEYS.white.map((key) => (
                <Pressable
                  key={key.note}
                  accessibilityRole="button"
                  accessibilityLabel={key.note}
                  onPress={() => pressKey(key.note)}
                  style={[styles.whiteKey, { left: key.index * WHITE_KEY_WIDTH }, active === key.note && styles.whiteKeyOn]}
                >
                  <Text pointerEvents="none" style={styles.keyLabel}>{key.note.startsWith("C") ? key.note : key.note[0]}</Text>
                </Pressable>
              ))}
              {KEYS.black.map((key) => (
                <Pressable
                  key={key.note}
                  accessibilityRole="button"
                  accessibilityLabel={key.note}
                  onPress={() => pressKey(key.note)}
                  style={[
                    styles.blackKey,
                    { left: (key.whiteIndex + 1) * WHITE_KEY_WIDTH - 13 },
                    active === key.note && styles.blackKeyOn,
                  ]}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: WHITE },
  content: { paddingHorizontal: 20 },
  header: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  headerCopy: { flex: 1 },
  title: { fontFamily: font.extraBold, fontSize: 24, lineHeight: 27, letterSpacing: -0.8, color: INK },
  subtitle: { fontFamily: font.bold, fontSize: 8.5, letterSpacing: 2.1, color: MUTED, marginTop: 6 },
  iconButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: PAPER, borderWidth: 1, borderColor: "rgba(54,68,90,0.12)", alignItems: "center", justifyContent: "center" },
  iconButtonOn: { backgroundColor: MAROON, borderColor: MAROON },
  staffCard: { borderRadius: 24, backgroundColor: WHITE, borderWidth: 1, borderColor: "rgba(132,0,22,0.10)", paddingVertical: 8, paddingHorizontal: 8, shadowColor: "#301728", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  played: { marginTop: 16, textAlign: "center", fontFamily: font.extraBold, fontSize: 22, color: INK },
  keyboard: { position: "absolute", left: 12, right: 12, borderRadius: 22, backgroundColor: PAPER, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, shadowColor: INK, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#D7D9E0", alignSelf: "center", marginBottom: 8 },
  keyboardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  keyboardNote: { fontFamily: font.extraBold, fontSize: 16, color: MAROON },
  keys: { width: KEYBOARD_WIDTH, height: 148 },
  whiteKey: { position: "absolute", top: 0, width: WHITE_KEY_WIDTH, height: 148, backgroundColor: WHITE, borderWidth: 1, borderColor: "#D5D0C8", borderBottomLeftRadius: 8, borderBottomRightRadius: 8, justifyContent: "flex-end", alignItems: "center", paddingBottom: 8 },
  whiteKeyOn: { backgroundColor: "#F3D5DB" },
  keyLabel: { fontFamily: font.medium, fontSize: 10, color: DIM },
  blackKey: { position: "absolute", top: 0, width: 26, height: 92, borderBottomLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: "#1C1A22", zIndex: 2 },
  blackKeyOn: { backgroundColor: MAROON },
});
