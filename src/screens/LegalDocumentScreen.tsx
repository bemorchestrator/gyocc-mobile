// Native reader for GYOCC's public documents (privacy policy and friends), so
// members read them inside the app instead of being sent to the website.
// Registered in both the signed-out and signed-in navigators as "Legal".
import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LEGAL_DOCUMENTS, LegalBlock, LegalDocumentId } from "../content/legal";
import { C, F, GUTTER, Headline, TopBar } from "./member/kit";

export type LegalRouteParams = { doc?: LegalDocumentId };

export default function LegalDocumentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const id = ((route.params ?? {}) as LegalRouteParams).doc ?? "privacy";
  const doc = LEGAL_DOCUMENTS[id] ?? LEGAL_DOCUMENTS.privacy;
  const [first, ...rest] = doc.title.split(" ");

  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Welcome"));

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <TopBar left={{ kind: "back", label: "Back", onPress: back }} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 64 }} showsVerticalScrollIndicator={false}>
        <Headline strong={first} light={rest.join(" ")} />
        <Text style={styles.updated}>Last updated {doc.updated}</Text>
        {!doc.approved ? (
          <Text style={styles.draft}>Draft: waiting for GYOCC approval. Wording may change.</Text>
        ) : null}

        <View style={styles.body}>
          {doc.intro.map((block, i) => <Block key={`intro-${i}`} block={block} />)}

          {doc.sections.map((section, s) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.heading} accessibilityRole="header">
                <Text style={styles.headingNumber}>{s + 1}  </Text>
                {section.heading}
              </Text>
              {section.blocks.map((block, i) => <Block key={`${s}-${i}`} block={block} />)}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "p":
      return (
        <Text style={styles.paragraph}>
          {block.lead ? <Text style={styles.lead}>{block.lead}</Text> : null}
          {block.text}
        </Text>
      );
    case "sub":
      return <Text style={styles.sub} accessibilityRole="header">{block.text}</Text>;
    case "list":
      return (
        <View style={styles.list}>
          {block.items.map((item) => (
            <View key={item} style={styles.listItem}>
              <View style={styles.bullet} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case "facts":
      return (
        <View style={styles.facts}>
          {block.items.map(([label, value]) => (
            <View key={label} style={styles.fact}>
              <Text style={styles.factLabel}>{label}</Text>
              <Text style={styles.factValue}>{value}</Text>
            </View>
          ))}
        </View>
      );
    case "contact":
      return (
        <View style={styles.facts}>
          {block.items.map((item) => (
            <Pressable
              key={item.label}
              disabled={!item.href}
              onPress={() => item.href && Linking.openURL(item.href).catch(() => undefined)}
              accessibilityRole={item.href ? "button" : undefined}
              style={styles.fact}
            >
              <Text style={styles.factLabel}>{item.label}</Text>
              <Text style={[styles.factValue, item.href && { color: C.maroon }]}>{item.value}</Text>
            </Pressable>
          ))}
        </View>
      );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  updated: { marginTop: 10, paddingHorizontal: GUTTER, fontFamily: F.regular, fontSize: 13, color: C.grey },
  draft: { marginTop: 8, marginHorizontal: GUTTER, fontFamily: F.medium, fontSize: 13, color: C.maroon },
  body: { paddingHorizontal: GUTTER, marginTop: 26 },
  section: { marginTop: 34 },
  heading: { fontFamily: F.demi, fontSize: 19, lineHeight: 25, color: C.ink, marginBottom: 4 },
  headingNumber: { fontFamily: F.regular, color: C.grey },
  sub: { fontFamily: F.demi, fontSize: 15.5, color: C.ink, marginTop: 18 },
  paragraph: { fontFamily: F.regular, fontSize: 15, lineHeight: 23, color: "#3A3A3A", marginTop: 10 },
  lead: { fontFamily: F.demi, color: C.ink },
  list: { marginTop: 10, gap: 10 },
  listItem: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.maroon, marginTop: 9 },
  listText: { flex: 1, fontFamily: F.regular, fontSize: 15, lineHeight: 23, color: "#3A3A3A" },
  facts: { marginTop: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.faint },
  fact: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.faint },
  factLabel: { fontFamily: F.medium, fontSize: 13, color: C.grey },
  factValue: { marginTop: 4, fontFamily: F.regular, fontSize: 15, lineHeight: 22, color: C.ink },
});
