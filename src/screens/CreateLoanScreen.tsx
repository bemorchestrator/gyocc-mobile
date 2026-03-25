import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { listEquipment } from "../api/equipment";
import { createLoan } from "../api/loans";
import { BorrowerType, Equipment } from "../types";
import { font } from "../constants/fonts";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

const TEAL = "#0D9488";
type Props = NativeStackScreenProps<any>;

const BORROWER_TYPES: { key: BorrowerType; label: string }[] = [
  { key: "member",     label: "Member" },
  { key: "msme",       label: "MSME" },
  { key: "individual", label: "Individual" },
];

interface FormData {
  qtyBorrowed: string;
  borrowerName: string;
  borrowerAddress: string;
  borrowerContact: string;
  dateBorrowed: string;
  expectedReturnDate: string;
  purpose: string;
  venue: string;
  notes: string;
}

export default function CreateLoanScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [borrowerType, setBorrowerType] = useState<BorrowerType>("member");
  const [showPicker, setShowPicker] = useState(false);

  const { data: equipmentList = [] } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => listEquipment(),
  });

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      qtyBorrowed: "1",
      borrowerName: "",
      borrowerAddress: "",
      borrowerContact: "",
      dateBorrowed: new Date().toISOString().split("T")[0],
      expectedReturnDate: "",
      purpose: "",
      venue: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      Toast.show({ type: "success", text1: "Loan created" });
      navigation.goBack();
    },
    onError: (err: Error) =>
      Toast.show({ type: "error", text1: "Error", text2: err.message }),
  });

  function onSubmit(data: FormData) {
    if (!selectedEquipment) {
      Toast.show({ type: "error", text1: "Please select an equipment item" });
      return;
    }
    mutation.mutate({
      equipmentId: selectedEquipment._id,
      equipmentName: selectedEquipment.name,
      qtyBorrowed: parseInt(data.qtyBorrowed, 10) || 1,
      borrowerType,
      borrowerName: data.borrowerName,
      borrowerAddress: data.borrowerAddress,
      borrowerContact: data.borrowerContact || undefined,
      dateBorrowed: data.dateBorrowed,
      expectedReturnDate: data.expectedReturnDate || undefined,
      purpose: data.purpose,
      venue: data.venue,
      notes: data.notes || undefined,
    });
  }

  const available = (equipmentList as Equipment[]).filter((e) => e.availableQty > 0);

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
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="clipboard-outline" size={28} color={TEAL} />
        </View>
        <Text style={styles.heroTitle}>New Loan</Text>
        <Text style={styles.heroSub}>Create a borrowing record</Text>
      </View>

      {/* ── White Sheet ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Equipment Picker */}
        <FormLabel text="Equipment *" />
        <TouchableOpacity
          style={[styles.selector, showPicker && styles.selectorOpen]}
          onPress={() => setShowPicker(!showPicker)}
        >
          <Ionicons name="cube-outline" size={16} color={selectedEquipment ? TEAL : "#94A3B8"} />
          <Text style={[styles.selectorText, !selectedEquipment && styles.selectorPlaceholder]} numberOfLines={1}>
            {selectedEquipment
              ? `${selectedEquipment.name}  (${selectedEquipment.availableQty} available)`
              : "Select equipment"}
          </Text>
          <Ionicons name={showPicker ? "chevron-up" : "chevron-down"} size={16} color="#94A3B8" />
        </TouchableOpacity>

        {showPicker && (
          <View style={styles.pickerList}>
            {available.length === 0 ? (
              <Text style={styles.pickerEmpty}>No equipment available</Text>
            ) : (
              available.map((e) => (
                <TouchableOpacity
                  key={e._id}
                  style={[styles.pickerOption, selectedEquipment?._id === e._id && styles.pickerOptionActive]}
                  onPress={() => { setSelectedEquipment(e); setShowPicker(false); }}
                >
                  <Text style={[styles.pickerOptionText, selectedEquipment?._id === e._id && styles.pickerOptionTextActive]}>
                    {e.name}
                  </Text>
                  <Text style={styles.pickerOptionQty}>{e.availableQty} avail</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Qty */}
        <FormLabel text="Quantity *" />
        <Controller
          control={control}
          name="qtyBorrowed"
          rules={{ required: "Required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.qtyBorrowed && styles.inputError]}
              value={value}
              onChangeText={onChange}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor="#A0AEC0"
            />
          )}
        />

        {/* Borrower Type */}
        <FormLabel text="Borrower Type" />
        <View style={styles.chipRow}>
          {BORROWER_TYPES.map((bt) => (
            <TouchableOpacity
              key={bt.key}
              style={[styles.chip, borrowerType === bt.key && styles.chipActive]}
              onPress={() => setBorrowerType(bt.key)}
            >
              <Text style={[styles.chipText, borrowerType === bt.key && styles.chipTextActive]}>
                {bt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Borrower Name */}
        <FormLabel text="Borrower Name *" />
        <Controller
          control={control}
          name="borrowerName"
          rules={{ required: "Name is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.borrowerName && styles.inputError]}
              value={value}
              onChangeText={onChange}
              placeholder="Full name"
              placeholderTextColor="#A0AEC0"
            />
          )}
        />
        {errors.borrowerName && <Text style={styles.errorText}>{errors.borrowerName.message}</Text>}

        {/* Address */}
        <FormLabel text="Address *" />
        <Controller
          control={control}
          name="borrowerAddress"
          rules={{ required: "Address is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea, errors.borrowerAddress && styles.inputError]}
              value={value}
              onChangeText={onChange}
              placeholder="Full address"
              placeholderTextColor="#A0AEC0"
              multiline
              textAlignVertical="top"
            />
          )}
        />
        {errors.borrowerAddress && <Text style={styles.errorText}>{errors.borrowerAddress.message}</Text>}

        {/* Contact */}
        <FormLabel text="Contact No." />
        <Controller
          control={control}
          name="borrowerContact"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder="+63..."
              placeholderTextColor="#A0AEC0"
              keyboardType="phone-pad"
            />
          )}
        />

        {/* Dates */}
        <View style={styles.rowFields}>
          <View style={{ flex: 1 }}>
            <FormLabel text="Borrow Date *" />
            <Controller
              control={control}
              name="dateBorrowed"
              rules={{ required: "Required" }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.dateBorrowed && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#A0AEC0"
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormLabel text="Return Date" />
            <Controller
              control={control}
              name="expectedReturnDate"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#A0AEC0"
                />
              )}
            />
          </View>
        </View>

        {/* Purpose */}
        <FormLabel text="Purpose *" />
        <Controller
          control={control}
          name="purpose"
          rules={{ required: "Purpose is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.purpose && styles.inputError]}
              value={value}
              onChangeText={onChange}
              placeholder="What will it be used for?"
              placeholderTextColor="#A0AEC0"
            />
          )}
        />
        {errors.purpose && <Text style={styles.errorText}>{errors.purpose.message}</Text>}

        {/* Venue */}
        <FormLabel text="Venue *" />
        <Controller
          control={control}
          name="venue"
          rules={{ required: "Venue is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.venue && styles.inputError]}
              value={value}
              onChangeText={onChange}
              placeholder="Location of use"
              placeholderTextColor="#A0AEC0"
            />
          )}
        />
        {errors.venue && <Text style={styles.errorText}>{errors.venue.message}</Text>}

        {/* Notes */}
        <FormLabel text="Notes" />
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={value}
              onChangeText={onChange}
              placeholder="Additional notes..."
              placeholderTextColor="#A0AEC0"
              multiline
              textAlignVertical="top"
            />
          )}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={mutation.isPending}
          activeOpacity={0.85}
        >
          <Ionicons name="add-outline" size={20} color="#fff" />
          <Text style={styles.submitText}>
            {mutation.isPending ? "Saving..." : "Create Loan"}
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
  heroTopRow: { alignSelf: "stretch", marginBottom: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  heroIcon: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  heroTitle: { fontSize: 22, fontFamily: font.extraBold, color: "#fff", letterSpacing: -0.3 },
  heroSub: { fontSize: 13, fontFamily: font.regular, color: "rgba(255,255,255,0.65)", marginTop: 4 },

  sheet: {
    flex: 1, backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24,
  },
  sheetContent: { padding: 24, paddingBottom: 48 },

  formLabel: { fontSize: 13, fontFamily: font.bold, color: TEAL, marginBottom: 8, marginTop: 16 },

  input: {
    backgroundColor: "#F3F4F6", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, fontFamily: font.regular, color: "#1A202C",
    borderWidth: 1, borderColor: "transparent",
  },
  inputError: { borderColor: "#EF4444" },
  textArea: { minHeight: 80 },
  errorText: { color: "#EF4444", fontSize: 12, fontFamily: font.regular, marginTop: 4 },

  // Equipment selector
  selector: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F3F4F6", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: "transparent",
  },
  selectorOpen: { borderColor: TEAL, backgroundColor: "#F0FDFA" },
  selectorText: { flex: 1, fontSize: 14, fontFamily: font.medium, color: "#1E293B" },
  selectorPlaceholder: { color: "#A0AEC0", fontFamily: font.regular },
  pickerList: {
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1, borderColor: "#E2E8F0",
    marginTop: 4, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  pickerOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  pickerOptionActive: { backgroundColor: "#F0FDFA" },
  pickerOptionText: { fontSize: 14, fontFamily: font.medium, color: "#1E293B" },
  pickerOptionTextActive: { color: TEAL },
  pickerOptionQty: { fontSize: 12, fontFamily: font.regular, color: "#94A3B8" },
  pickerEmpty: { padding: 16, textAlign: "center", color: "#94A3B8", fontFamily: font.regular },

  // Chips
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: "#F1F5F9", alignItems: "center",
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  chipActive: { backgroundColor: TEAL, borderColor: TEAL },
  chipText: { fontSize: 13, fontFamily: font.semiBold, color: "#64748B" },
  chipTextActive: { color: "#fff" },

  rowFields: { flexDirection: "row", gap: 10 },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: TEAL, borderRadius: 12, paddingVertical: 16, marginTop: 28,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontFamily: font.bold, letterSpacing: 0.3 },
});
