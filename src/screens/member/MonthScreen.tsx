// This Month: dark gauge of calls this month, rehearsals vs gigs
// (design/mockups/board-3-home-analytics.png, right screen).
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Line, Path } from "react-native-svg";
import { C, F, GUTTER, Headline, TopBar, usePortal } from "./kit";
import { monthCalls } from "./stats";

const R = 118;
const PAD = 8;
const W = (R + PAD) * 2;
const H = R + PAD * 2;
const CX = W / 2;
const CY = R + PAD;
const CREAM = "#F3E2A9";

const point = (angle: number, radius = R) => `${CX + radius * Math.cos(angle)} ${CY + radius * Math.sin(angle)}`;
const arc = (from: number, to: number) => `M ${point(from)} A ${R} ${R} 0 0 1 ${point(to)}`;

function Gauge({ rehearsals, gigs }: { rehearsals: number; gigs: number }) {
  const total = rehearsals + gigs;
  const split = Math.PI + Math.PI * (total ? rehearsals / total : 0.5);
  const ticks = Array.from({ length: 31 }, (_, i) => Math.PI + (Math.PI * i) / 30);
  return (
    <Svg width={W} height={H}>
      {ticks.map((a, i) => (
        <Line key={i} x1={CX + (R - 16) * Math.cos(a)} y1={CY + (R - 16) * Math.sin(a)} x2={CX + (R - (i % 5 ? 20 : 24)) * Math.cos(a)} y2={CY + (R - (i % 5 ? 20 : 24)) * Math.sin(a)} stroke={C.navyLine} strokeWidth={1} />
      ))}
      {!total ? <Path d={arc(Math.PI, 2 * Math.PI)} stroke={C.navyLine} strokeWidth={2.5} fill="none" /> : null}
      {rehearsals ? <Path d={arc(Math.PI, split)} stroke={C.blue} strokeWidth={2.5} strokeLinecap="round" fill="none" /> : null}
      {gigs ? <Path d={arc(split, 2 * Math.PI)} stroke={CREAM} strokeWidth={2.5} strokeLinecap="round" fill="none" /> : null}
      {rehearsals && gigs ? (
        <Line x1={CX + (R - 7) * Math.cos(split)} y1={CY + (R - 7) * Math.sin(split)} x2={CX + (R + 7) * Math.cos(split)} y2={CY + (R + 7) * Math.sin(split)} stroke={C.maroon} strokeWidth={3} strokeLinecap="round" />
      ) : null}
    </Svg>
  );
}

export default function MonthScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const portal = usePortal().data;
  const counts = monthCalls(portal);
  const gigs = counts.gigs + counts.events;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <TopBar
        dark
        left={{ kind: "back", label: "Back", onPress: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home")) }}
        right={{ kind: "calendar", label: "Day view", onPress: () => navigation.navigate("Schedule", { day: new Date().toISOString() }) }}
      />
      <Headline dark strong="This" light="Month" />

      <View style={styles.gaugeWrap} accessibilityLabel={`${counts.total} calls this month: ${counts.rehearsals} rehearsals, ${gigs} gigs`}>
        <Gauge rehearsals={counts.rehearsals} gigs={gigs} />
        <View style={styles.gaugeCenter} pointerEvents="none">
          <Text style={styles.total}>{counts.total}</Text>
          <Text style={styles.totalLabel}>{counts.total === 1 ? "call" : "calls"}</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.split}>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>Rehearsals</Text>
            <Text style={styles.cellValue}>{counts.rehearsals}</Text>
          </View>
          <View style={[styles.cell, styles.cellRight]}>
            <Text style={styles.cellLabel}>{counts.events ? "Gigs & events" : "Gigs"}</Text>
            <Text style={styles.cellValue}>{gigs}</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.bar, { paddingBottom: insets.bottom + 26 }, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.navigate("Week")}
          accessibilityRole="button"
        >
          <Text style={styles.barText}>See schedule</Text>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.navy },
  gaugeWrap: { alignSelf: "center", marginTop: 90, width: W, height: H },
  gaugeCenter: { position: "absolute", left: 0, right: 0, top: CY - 70, alignItems: "center" },
  total: { fontFamily: F.regular, fontSize: 52, color: C.navyText, letterSpacing: -1 },
  totalLabel: { fontFamily: F.regular, fontSize: 15, color: C.navyMuted, marginTop: 0 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0 },
  split: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.navyLine },
  cell: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 14, paddingHorizontal: GUTTER - 10, paddingVertical: 24 },
  cellRight: { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: C.navyLine, justifyContent: "center" },
  cellLabel: { fontFamily: F.regular, fontSize: 14, color: C.navyMuted },
  cellValue: { fontFamily: F.regular, fontSize: 20, color: C.navyText },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingTop: 26, paddingHorizontal: GUTTER },
  barText: { fontFamily: F.regular, fontSize: 18, color: C.navyText },
  arrow: { position: "absolute", right: GUTTER - 10, top: 22, fontFamily: F.light, fontSize: 24, color: C.navyText },
});
