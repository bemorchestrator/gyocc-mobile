import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { createEquipment, updateEquipment } from "../api/equipment";
import { Equipment, EquipmentCondition } from "../types";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { font } from '../constants/fonts';

const TEAL = "#0D9488";
const CONDITIONS: EquipmentCondition[] = ["Excellent", "Good", "Fair", "Poor"];

type Props = NativeStackScreenProps<any>;

interface FormData {
  name: string;
  category: string;
  description: string;
  serialNumber: string;
  totalQty: string;
  condition: EquipmentCondition;
  isFromDtiGrant: boolean;
  grantYear: string;
  acquisitionCost: string;
  notes: string;
}

export default function AddEditEquipmentScreen({ route, navigation }: Props) {
  const params = route.params as { id?: string; equipment?: Equipment } | undefined;
  const existing = params?.equipment;
  const isEdit = !!existing;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { control, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    defaultValues: {
      name: existing?.name || "",
      category: existing?.category || "",
      description: existing?.description || "",
      serialNumber: existing?.serialNumber || "",
      totalQty: existing?.totalQty?.toString() || "1",
      condition: existing?.condition || "Good",
      isFromDtiGrant: existing?.isFromDtiGrant || false,
      grantYear: existing?.grantYear?.toString() || "",
      acquisitionCost: existing?.acquisitionCost?.toString() || "",
      notes: existing?.notes || "",
    },
  });

  const isGrant = watch("isFromDtiGrant");
  const [selectedCondition, setSelectedCondition] = useState<EquipmentCondition>(
    existing?.condition || "Good"
  );

  const mutation = useMutation({
    mutationFn: (data: Partial<Equipment>) =>
      isEdit ? updateEquipment(existing!._id, data) : createEquipment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      Toast.show({
        type: "success",
        text1: isEdit ? "Equipment updated" : "Equipment created",
      });
      navigation.goBack();
    },
    onError: (err: Error) => {
      Toast.show({ type: "error", text1: "Error", text2: err.message });
    },
  });

  function onSubmit(data: FormData) {
    mutation.mutate({
      name: data.name,
      category: data.category,
      description: data.description || undefined,
      serialNumber: data.serialNumber || undefined,
      totalQty: parseInt(data.totalQty, 10) || 1,
      condition: selectedCondition,
      isFromDtiGrant: data.isFromDtiGrant,
      grantYear: data.grantYear ? parseInt(data.grantYear, 10) : undefined,
      acquisitionCost: data.acquisitionCost ? parseFloat(data.acquisitionCost) : undefined,
      notes: data.notes || undefined,
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── Teal Hero ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />
        <View style={styles.heroIcon}>
          <Ionicons name={isEdit ? "create-outline" : "add-circle-outline"} size={30} color={TEAL} />
        </View>
        <Text style={styles.heroTitle}>{isEdit ? "Edit Equipment" : "Add Equipment"}</Text>
        <Text style={styles.heroSub}>{isEdit ? "Update item details" : "Register a new item"}</Text>
      </View>

      {/* ── White Sheet ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormLabel text="Item Name *" />
        <Controller
          control={control}
          name="name"
          rules={{ required: "Item name is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={value}
              onChangeText={onChange}
              placeholder="e.g. Canon EOS R5"
              placeholderTextColor="#A0AEC0"
            />
          )}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}

        <FormLabel text="Category *" />
        <Controller
          control={control}
          name="category"
          rules={{ required: "Category is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.category && styles.inputError]}
              value={value}
              onChangeText={onChange}
              placeholder="e.g. Camera, ICT Equipment"
              placeholderTextColor="#A0AEC0"
            />
          )}
        />
        {errors.category && <Text style={styles.errorText}>{errors.category.message}</Text>}

        <FormLabel text="Description" />
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={value}
              onChangeText={onChange}
              placeholder="Brief description of the item"
              placeholderTextColor="#A0AEC0"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          )}
        />

        <FormLabel text="Serial / Item Code" />
        <Controller
          control={control}
          name="serialNumber"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder="Serial number or item code"
              placeholderTextColor="#A0AEC0"
            />
          )}
        />

        <FormLabel text="Total Quantity *" />
        <Controller
          control={control}
          name="totalQty"
          rules={{ required: "Quantity is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.totalQty && styles.inputError]}
              value={value}
              onChangeText={onChange}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor="#A0AEC0"
            />
          )}
        />
        {errors.totalQty && <Text style={styles.errorText}>{errors.totalQty.message}</Text>}

        <FormLabel text="Condition" />
        <View style={styles.chipRow}>
          {CONDITIONS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, selectedCondition === c && styles.chipActive]}
              onPress={() => setSelectedCondition(c)}
            >
              <Text style={[styles.chipText, selectedCondition === c && styles.chipTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>DTI Grant Item</Text>
            <Text style={styles.switchSub}>Was this acquired through a DTI grant?</Text>
          </View>
          <Controller
            control={control}
            name="isFromDtiGrant"
            render={({ field: { onChange, value } }) => (
              <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ true: TEAL, false: "#E2E8F0" }}
                thumbColor="#FFFFFF"
              />
            )}
          />
        </View>

        {isGrant && (
          <>
            <FormLabel text="Grant Year" />
            <Controller
              control={control}
              name="grantYear"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="number-pad"
                  placeholder="e.g. 2024"
                  placeholderTextColor="#A0AEC0"
                />
              )}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={mutation.isPending}
          activeOpacity={0.85}
        >
          <Ionicons name={isEdit ? "checkmark-outline" : "add-outline"} size={20} color="#fff" />
          <Text style={styles.submitText}>
            {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Equipment"}
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
  root: {
    flex: 1,
    backgroundColor: TEAL,
  },

  // ── Hero ──
  hero: {
    backgroundColor: TEAL,
    paddingTop: 20,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    overflow: "hidden",
  },
  decCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 30,
    borderColor: "rgba(255,255,255,0.07)",
    top: -50,
    right: -50,
  },
  decCircle2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 22,
    borderColor: "rgba(255,255,255,0.05)",
    bottom: -30,
    left: -20,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: font.extraBold,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
  },

  // ── White Sheet ──
  sheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
  },
  sheetContent: {
    padding: 24,
    paddingBottom: 48,
  },

  // Form
  formLabel: {
    fontSize: 14,
    fontFamily: font.bold,
    color: TEAL,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A202C",
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  textArea: {
    minHeight: 88,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },

  // Condition chips
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  chipText: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: font.semiBold,
  },
  chipTextActive: {
    color: "#FFFFFF",
  },

  // DTI Switch
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginTop: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontFamily: font.bold,
    color: "#1E293B",
  },
  switchSub: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },

  // Submit
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 28,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: font.bold,
    letterSpacing: 0.3,
  },
});
