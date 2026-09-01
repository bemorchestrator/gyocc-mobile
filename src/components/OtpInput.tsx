import React, { useMemo, useRef, useState } from "react";
import {
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from "react-native";
import { font } from "../constants/fonts";

const FIELD = "#F4F5F0";
const FIELD_INK = "#3F3230";
const ACTIVE = "#F1F0EC";
const ERROR = "#E8D7D8";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  /** Fires once the final digit is entered — lets the screen auto-submit. */
  onComplete?: (value: string) => void;
  hasError?: boolean;
  editable?: boolean;
  autoFocus?: boolean;
}

/**
 * Six-box one-time-code field.
 *
 * A single hidden TextInput sits behind the boxes rather than one input per
 * digit: that keeps iOS/Android SMS and Mail autofill working (they fill the
 * whole code at once), and it means backspace behaves the way people expect
 * instead of hopping between fields.
 */
export default function OtpInput({
  value,
  onChange,
  length = 6,
  onComplete,
  hasError = false,
  editable = true,
  autoFocus = true,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const digits = useMemo(() => {
    const chars = value.split("");
    return Array.from({ length }, (_, i) => chars[i] ?? "");
  }, [value, length]);

  const handleChange = (next: string) => {
    const cleaned = next.replace(/\D/g, "").slice(0, length);
    onChange(cleaned);
    if (cleaned.length === length) onComplete?.(cleaned);
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    // Android does not always report deletions through onChangeText when the
    // field is already empty; handle it explicitly so the last digit clears.
    if (e.nativeEvent.key === "Backspace" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="button"
      accessibilityLabel={`Verification code, ${value.length} of ${length} digits entered`}
    >
      <View style={styles.row}>
        {digits.map((digit, index) => {
          const isActive = focused && index === activeIndex && editable;
          return (
            <View
              key={index}
              style={[
                styles.box,
                hasError && styles.boxError,
                isActive && styles.boxActive,
                !editable && styles.boxDisabled,
              ]}
            >
              <Text style={styles.digit}>{digit}</Text>
            </View>
          );
        })}
      </View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onKeyPress={handleKeyPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={editable}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
        maxLength={length}
        style={styles.hiddenInput}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  box: {
    flex: 1,
    height: 60,
    borderRadius: 14,
    backgroundColor: FIELD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  boxActive: { borderColor: ACTIVE, backgroundColor: "#FFFFFF" },
  boxError: { backgroundColor: ERROR },
  boxDisabled: { opacity: 0.6 },
  digit: { fontSize: 24, fontFamily: font.bold, color: FIELD_INK },
  // Covers the boxes so taps anywhere focus the field, but stays invisible.
  hiddenInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    opacity: 0,
  },
});
