import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { createGig, updateGig, deleteGig, listGigTypes } from "../api/gigs";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Gig, GigType, GigStatus } from "../types";
import { font } from '../constants/fonts';

const TEAL = "#0D9488";
const STATUSES: GigStatus[] = ["Inquiry", "Confirmed", "Completed", "Cancelled"];
const STATUS_COLOR: Record<string, string> = {
  Inquiry: "#D97706", Confirmed: "#2563EB", Completed: "#16A34A", Cancelled: "#DC2626",
};

type Props = NativeStackScreenProps<any>;

interface ProgramRow { time: string; title: string }

export default function AddEditGigScreen({ route, navigation }: Props) {
  const params = route.params as { id?: string; gig?: Gig } | undefined;
  const existing = params?.gig;
  const isEdit = !!existing;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Basic fields
  const [title,        setTitle]        = useState(existing?.title        ?? "");
  const [type,         setType]         = useState(existing?.type         ?? "");
  const [status,       setStatus]       = useState<GigStatus>(existing?.status ?? "Inquiry");
  const [fee,          setFee]          = useState(existing?.contractedFee ? String(existing.contractedFee) : "");
  const [startDate,    setStartDate]    = useState(existing?.startDate ? existing.startDate.slice(0, 10) : "");
  const [endDate,      setEndDate]      = useState(existing?.endDate   ? existing.endDate.slice(0, 10)   : "");
  const [virtualLink,  setVirtualLink]  = useState(existing?.virtualLink  ?? "");
  const [notes,        setNotes]        = useState(existing?.notes         ?? "");

  // Client
  const [clientName,    setClientName]    = useState(existing?.client?.name    ?? "");
  const [clientContact, setClientContact] = useState(existing?.client?.contact ?? "");
  const [clientEmail,   setClientEmail]   = useState(existing?.client?.email   ?? "");
  const [clientPhone,   setClientPhone]   = useState(existing?.client?.phone   ?? "");

  // Venue
  const [venueName,    setVenueName]    = useState(existing?.venue?.name    ?? "");
  const [venueAddress, setVenueAddress] = useState(existing?.venue?.address ?? "");
  const [venueMapUrl,  setVenueMapUrl]  = useState(existing?.venue?.mapUrl  ?? "");

  // Program
  const [program, setProgram] = useState<ProgramRow[]>(
    existing?.program?.length
      ? existing.program.map((p) => ({ time: p.time ?? "", title: p.title }))
      : []
  );

  const { data: gigTypes = [] } = useQuery({
    queryKey: ["gig-types"],
    queryFn: listGigTypes,
  });

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit ? updateGig(existing!._id, payload) : createGig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gigs"] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ["gig", existing!._id] });
      Toast.show({ type: "success", text1: isEdit ? "Gig updated" : "Gig created" });
      navigation.goBack();
    },
    onError: () => Toast.show({ type: "error", text1: "Failed to save gig" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGig(existing!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gigs"] });
      Toast.show({ type: "success", text1: "Gig deleted" });
      navigation.navigate("GigList");
    },
    onError: () => Toast.show({ type: "error", text1: "Failed to delete gig" }),
  });

  function handleSave() {
    if (!title.trim()) {
      Toast.show({ type: "error", text1: "Title is required" });
      return;
    }
    if (!type) {
      Toast.show({ type: "error", text1: "Gig type is required" });
      return;
    }
    if (!startDate) {
      Toast.show({ type: "error", text1: "Start date is required" });
      return;
    }

    mutation.mutate({
      title: title.trim(),
      type,
      status,
      contractedFee: fee ? parseFloat(fee) : 0,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate || startDate).toISOString(),
      virtualLink: virtualLink.trim() || undefined,
      notes: notes.trim() || undefined,
      client: {
        name: clientName.trim() || undefined,
        contact: clientContact.trim() || undefined,
        email: clientEmail.trim() || undefined,
        phone: clientPhone.trim() || undefined,
      },
      venue: {
        name: venueName.trim() || undefined,
        address: venueAddress.trim() || undefined,
        mapUrl: venueMapUrl.trim() || undefined,
      },
      program: program.filter((p) => p.title.trim()).map((p) => ({
        time: p.time.trim() || undefined,
        title: p.title.trim(),
      })),
    });
  }

  function confirmDelete() {
    Alert.alert("Delete Gig", `Delete "${title}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
    ]);
  }

  function addProgramRow() {
    setProgram((prev) => [...prev, { time: "", title: "" }]);
  }

  function updateProgramRow(i: number, field: keyof ProgramRow, value: string) {
    setProgram((prev) => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  function removeProgramRow(i: number) {
    setProgram((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── Hero ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />
        <View style={styles.heroTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          {isEdit && (
            <TouchableOpacity onPress={confirmDelete} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color="#FCA5A5" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name={isEdit ? "create-outline" : "add-circle-outline"} size={28} color={TEAL} />
        </View>
        <Text style={styles.heroTitle}>{isEdit ? "Edit Gig" : "New Gig"}</Text>
        <Text style={styles.heroSub}>{isEdit ? "Update booking details" : "Add a new booking"}</Text>
      </View>

      {/* ── White Sheet ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Basic Info ── */}
        <Text style={styles.groupLabel}>Basic Info</Text>
        <View style={styles.group}>
          <FormLabel text="Title *" />
          <TextInput
            style={styles.input}
            placeholder="e.g. Wedding Reception"
            placeholderTextColor="#A0AEC0"
            value={title}
            onChangeText={setTitle}
          />

          <FormLabel text="Gig Type *" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={styles.chipRow}>
              {(gigTypes as GigType[]).map((t) => (
                <TouchableOpacity
                  key={t._id}
                  style={[
                    styles.typeChip,
                    type === t.name && { backgroundColor: t.color, borderColor: t.color },
                  ]}
                  onPress={() => setType(t.name)}
                >
                  <View style={[styles.typeDot, { backgroundColor: type === t.name ? "#fff" : t.color }]} />
                  <Text style={[styles.typeChipText, type === t.name && { color: "#fff" }]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {(gigTypes as GigType[]).length === 0 && (
                <TextInput
                  style={[styles.input, { minWidth: 180 }]}
                  placeholder="Type (e.g. Wedding)"
                  placeholderTextColor="#A0AEC0"
                  value={type}
                  onChangeText={setType}
                />
              )}
            </View>
          </ScrollView>

          {isEdit && (
            <>
              <FormLabel text="Status" />
              <View style={styles.chipRow}>
                {STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusChip,
                      status === s && { backgroundColor: STATUS_COLOR[s], borderColor: STATUS_COLOR[s] },
                    ]}
                    onPress={() => setStatus(s)}
                  >
                    <Text style={[styles.statusChipText, status === s && { color: "#fff" }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <FormLabel text="Contracted Fee (₱)" />
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#A0AEC0"
            value={fee}
            onChangeText={setFee}
            keyboardType="decimal-pad"
          />

          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <FormLabel text="Start Date *" />
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#A0AEC0"
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormLabel text="End Date" />
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#A0AEC0"
                value={endDate}
                onChangeText={setEndDate}
              />
            </View>
          </View>

          <FormLabel text="Virtual Link" />
          <TextInput
            style={styles.input}
            placeholder="https://zoom.us/..."
            placeholderTextColor="#A0AEC0"
            value={virtualLink}
            onChangeText={setVirtualLink}
            autoCapitalize="none"
            keyboardType="url"
          />

          <FormLabel text="Notes" />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Internal notes..."
            placeholderTextColor="#A0AEC0"
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* ── Client ── */}
        <Text style={styles.groupLabel}>Client</Text>
        <View style={styles.group}>
          <FormLabel text="Name" />
          <TextInput
            style={styles.input}
            placeholder="Client or organization name"
            placeholderTextColor="#A0AEC0"
            value={clientName}
            onChangeText={setClientName}
          />
          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <FormLabel text="Contact Person" />
              <TextInput
                style={styles.input}
                placeholder="Contact person"
                placeholderTextColor="#A0AEC0"
                value={clientContact}
                onChangeText={setClientContact}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormLabel text="Phone" />
              <TextInput
                style={styles.input}
                placeholder="+63..."
                placeholderTextColor="#A0AEC0"
                value={clientPhone}
                onChangeText={setClientPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>
          <FormLabel text="Email" />
          <TextInput
            style={styles.input}
            placeholder="client@email.com"
            placeholderTextColor="#A0AEC0"
            value={clientEmail}
            onChangeText={setClientEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* ── Venue ── */}
        <Text style={styles.groupLabel}>Venue</Text>
        <View style={styles.group}>
          <FormLabel text="Venue Name" />
          <TextInput
            style={styles.input}
            placeholder="e.g. Grand Ballroom, City Hall"
            placeholderTextColor="#A0AEC0"
            value={venueName}
            onChangeText={setVenueName}
          />
          <FormLabel text="Address" />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Full address"
            placeholderTextColor="#A0AEC0"
            value={venueAddress}
            onChangeText={setVenueAddress}
            multiline
            textAlignVertical="top"
          />
          <FormLabel text="Google Maps URL" />
          <TextInput
            style={styles.input}
            placeholder="https://maps.google.com/..."
            placeholderTextColor="#A0AEC0"
            value={venueMapUrl}
            onChangeText={setVenueMapUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        {/* ── Program ── */}
        <View style={styles.programHeader}>
          <Text style={styles.groupLabel}>Program</Text>
          <TouchableOpacity style={styles.addProgramBtn} onPress={addProgramRow}>
            <Ionicons name="add" size={16} color={TEAL} />
            <Text style={styles.addProgramText}>Add Item</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.group}>
          {program.length === 0 ? (
            <Text style={styles.programEmpty}>No program items yet. Tap "Add Item" to add.</Text>
          ) : (
            program.map((row, i) => (
              <View key={i} style={styles.programRow}>
                <TextInput
                  style={[styles.input, styles.programTimeInput]}
                  placeholder="Time"
                  placeholderTextColor="#A0AEC0"
                  value={row.time}
                  onChangeText={(v) => updateProgramRow(i, "time", v)}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Item title *"
                  placeholderTextColor="#A0AEC0"
                  value={row.title}
                  onChangeText={(v) => updateProgramRow(i, "title", v)}
                />
                <TouchableOpacity onPress={() => removeProgramRow(i)} style={styles.removeProgramBtn}>
                  <Ionicons name="close-circle" size={20} color="#CBD5E1" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSave}
          disabled={mutation.isPending}
          activeOpacity={0.85}
        >
          <Ionicons name={isEdit ? "checkmark-outline" : "add-outline"} size={20} color="#fff" />
          <Text style={styles.submitText}>
            {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Gig"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormLabel({ text }: { text: string }) {
  return <Text style={styles.formLabel}>{text}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TEAL },

  // Hero
  hero: {
    backgroundColor: TEAL, paddingHorizontal: 24,
    paddingBottom: 44, alignItems: "center", overflow: "hidden",
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
    alignSelf: "stretch", marginBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(239,68,68,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  heroIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  heroTitle: { fontSize: 22, fontFamily: font.extraBold, color: "#fff", letterSpacing: -0.3 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 },

  // Sheet
  sheet: {
    flex: 1, backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24,
  },
  sheetContent: { padding: 24, paddingBottom: 48, gap: 0 },

  // Groups
  groupLabel: {
    fontSize: 12, fontFamily: font.bold, color: "#94A3B8",
    textTransform: "uppercase", letterSpacing: 0.8,
    marginTop: 20, marginBottom: 10,
  },
  group: {
    backgroundColor: "#F8FAFC", borderRadius: 16,
    borderWidth: 1, borderColor: "#E2E8F0", padding: 16,
  },

  // Form fields
  formLabel: { fontSize: 13, fontFamily: font.bold, color: TEAL, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#F3F4F6", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#1A202C",
    borderWidth: 1, borderColor: "transparent",
  },
  textArea: { minHeight: 72 },
  rowFields: { flexDirection: "row", gap: 10 },

  // Type chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: "#F1F5F9",
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  typeChipText: { fontSize: 13, fontFamily: font.semiBold, color: "#64748B" },

  // Status chips
  statusChip: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: "#F1F5F9", borderWidth: 1,
    borderColor: "#E2E8F0", alignItems: "center",
  },
  statusChipText: { fontSize: 12, fontFamily: font.semiBold, color: "#64748B" },

  // Program
  programHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 20, marginBottom: 10,
  },
  addProgramBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: TEAL,
  },
  addProgramText: { fontSize: 12, fontFamily: font.semiBold, color: TEAL },
  programRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  programTimeInput: { width: 80 },
  removeProgramBtn: { padding: 2 },
  programEmpty: { fontSize: 13, color: "#94A3B8", textAlign: "center", paddingVertical: 12 },

  // Submit
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: TEAL, borderRadius: 12,
    paddingVertical: 16, marginTop: 28,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontFamily: font.bold, letterSpacing: 0.3 },
});
