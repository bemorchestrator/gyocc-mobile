import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Alert, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  listGigTypes,
  createGigType,
  updateGigType,
  deleteGigType,
  listGigs,
} from "../api/gigs";
import { GigType } from "../types";
import { font } from "../constants/fonts";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

const TEAL = "#0D9488";
type Props = NativeStackScreenProps<any>;

const PRESET_COLORS = [
  "#0D9488","#2563EB","#7C3AED","#DB2777","#DC2626",
  "#EA580C","#D97706","#65A30D","#0891B2","#64748B",
];

export default function GigTypesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<GigType | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["gig-types"],
    queryFn: listGigTypes,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? updateGigType(editing._id, { name, color })
        : createGigType({ name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig-types"] });
      Toast.show({ type: "success", text1: editing ? "Type updated" : "Type created" });
      closeModal();
    },
    onError: () => Toast.show({ type: "error", text1: "Failed to save" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGigType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig-types"] });
      Toast.show({ type: "success", text1: "Type deleted" });
    },
    onError: () => Toast.show({ type: "error", text1: "Failed to delete" }),
  });

  function openAdd() {
    setEditing(null);
    setName("");
    setColor(PRESET_COLORS[0]);
    setModalVisible(true);
  }

  function openEdit(t: GigType) {
    setEditing(t);
    setName(t.name);
    setColor(t.color);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditing(null);
    setName("");
  }

  async function confirmDelete(t: GigType) {
    // Fix #16: check if type is in use before deleting
    try {
      const gigsData = await listGigs({ type: t.name });
      const inUseCount = gigsData.length;
      if (inUseCount > 0) {
        Alert.alert(
          "Type In Use",
          `"${t.name}" is used by ${inUseCount} gig${inUseCount > 1 ? "s" : ""}. Deleting it won't remove those gigs, but their type label will appear uncoloured. Continue?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Delete Anyway", style: "destructive", onPress: () => deleteMutation.mutate(t._id) },
          ]
        );
      } else {
        Alert.alert("Delete Type", `Delete "${t.name}"?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(t._id) },
        ]);
      }
    } catch {
      Alert.alert("Delete Type", `Delete "${t.name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(t._id) },
      ]);
    }
  }

  function handleSave() {
    if (!name.trim()) {
      Toast.show({ type: "error", text1: "Name is required" });
      return;
    }
    saveMutation.mutate();
  }

  return (
    <View style={styles.root}>
      {/* ── Hero ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />
        <View style={styles.heroTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Ionicons name="add" size={20} color={TEAL} />
          </TouchableOpacity>
        </View>
        <Text style={styles.heroTitle}>Gig Types</Text>
        <Text style={styles.heroSub}>Manage your booking categories</Text>
      </View>

      {/* ── White Sheet ── */}
      <View style={styles.sheet}>
        <FlatList
          data={types as GigType[]}
          keyExtractor={(t) => t._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="musical-notes-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>No gig types yet</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
                <Text style={styles.emptyAddText}>Add First Type</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: t }) => (
            <View style={styles.typeCard}>
              <View style={[styles.colorDot, { backgroundColor: t.color }]} />
              <Text style={styles.typeName}>{t.name}</Text>
              <View style={styles.typeActions}>
                <TouchableOpacity onPress={() => openEdit(t)} style={styles.actionBtn}>
                  <Ionicons name="create-outline" size={18} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(t)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      {/* ── Add/Edit Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.header}>
              <Text style={modal.title}>{editing ? "Edit Type" : "New Gig Type"}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={modal.label}>Name *</Text>
            <TextInput
              style={modal.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Wedding, Corporate"
              placeholderTextColor="#A0AEC0"
              autoFocus
            />

            <Text style={modal.label}>Color</Text>
            <View style={modal.colorRow}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[modal.colorDot, { backgroundColor: c }, color === c && modal.colorDotActive]}
                  onPress={() => setColor(c)}
                >
                  {color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview */}
            <View style={[modal.preview, { backgroundColor: color + "20", borderColor: color + "40" }]}>
              <View style={[modal.previewDot, { backgroundColor: color }]} />
              <Text style={[modal.previewText, { color }]}>{name || "Preview"}</Text>
            </View>

            <TouchableOpacity
              style={[modal.saveBtn, saveMutation.isPending && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saveMutation.isPending}
            >
              <Text style={modal.saveBtnText}>
                {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Create Type"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TEAL },
  hero: {
    backgroundColor: TEAL, paddingHorizontal: 24,
    paddingBottom: 44, overflow: "hidden",
  },
  decCircle1: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    borderWidth: 30, borderColor: "rgba(255,255,255,0.07)", top: -50, right: -50,
  },
  decCircle2: {
    position: "absolute", width: 140, height: 140, borderRadius: 70,
    borderWidth: 22, borderColor: "rgba(255,255,255,0.05)", bottom: -30, left: -20,
  },
  heroTopRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  heroTitle: { fontSize: 24, fontFamily: font.extraBold, color: "#fff", letterSpacing: -0.5 },
  heroSub: { fontSize: 13, fontFamily: font.regular, color: "rgba(255,255,255,0.65)", marginTop: 4 },

  sheet: {
    flex: 1, backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24,
    paddingTop: 20,
  },
  list: { paddingHorizontal: 20, paddingBottom: 120, gap: 10 },

  typeCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#F8FAFC", borderRadius: 14,
    borderWidth: 1, borderColor: "#E2E8F0", padding: 16,
  },
  colorDot: { width: 18, height: 18, borderRadius: 9 },
  typeName: { flex: 1, fontSize: 15, fontFamily: font.bold, color: "#1E293B" },
  typeActions: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 6 },

  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: font.medium, color: "#94A3B8" },
  emptyAddBtn: {
    backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4,
  },
  emptyAddText: { color: "#fff", fontFamily: font.bold, fontSize: 14 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 44,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20,
  },
  title: { fontSize: 17, fontFamily: font.bold, color: "#1E293B" },
  label: { fontSize: 13, fontFamily: font.bold, color: TEAL, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: "#F3F4F6", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, fontFamily: font.regular, color: "#1A202C", marginBottom: 16,
  },
  colorRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  colorDot: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  colorDotActive: {
    borderWidth: 3, borderColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  preview: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start", marginBottom: 20,
  },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  previewText: { fontSize: 13, fontFamily: font.semiBold },
  saveBtn: {
    backgroundColor: TEAL, borderRadius: 12, paddingVertical: 16, alignItems: "center",
    shadowColor: TEAL, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: font.bold },
});
