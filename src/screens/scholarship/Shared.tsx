import React from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { font } from '../../constants/fonts'

export const color = { ink: '#111527', maroon: '#840016', green: '#1B8C37', orchid: '#9A7182', muted: '#587284', dim: '#8A7E78', cloud: '#F1F0EC', card: '#F4F5F0', white: '#FFFFFF', border: 'rgba(54,68,90,.12)' }
export type Nav = { navigate: (screen: string, params?: Record<string, unknown>) => void; goBack?: () => void }

export function Page({ children, refreshing, onRefresh, header }: { children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void; header?: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  return <ScrollView keyboardShouldPersistTaps="handled" style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]} refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={color.maroon} /> : undefined}>
    {header}
    {children}
  </ScrollView>
}

export function Header({ title, navigation, back = 'Member', subtitle, root }: { title: string; navigation: Nav; back?: string; subtitle?: string; root?: boolean }) {
  return <View style={styles.header}>{root ? null : <TouchableOpacity accessibilityLabel="Back" style={styles.back} onPress={() => navigation.goBack ? navigation.goBack() : navigation.navigate(back)}><Ionicons name="arrow-back" size={20} color={color.ink} /></TouchableOpacity>}<View style={styles.grow}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View></View>
}

export function ActionLink({ icon, title, body, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string; onPress: () => void }) {
  return <TouchableOpacity style={styles.action} activeOpacity={.72} onPress={onPress}><View style={styles.actionIcon}><Ionicons name={icon} size={21} color={color.maroon} /></View><View style={styles.grow}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionBody}>{body}</Text></View><Ionicons name="chevron-forward" size={17} color={color.dim} /></TouchableOpacity>
}

export function Button({ label, onPress, disabled, secondary }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <TouchableOpacity disabled={disabled} style={[styles.button, secondary && styles.buttonSecondary, disabled && styles.disabled]} onPress={onPress}><Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{label}</Text></TouchableOpacity>
}

export function Field({ label, value, onChangeText, placeholder, multiline }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean }) {
  return <View style={styles.fieldWrap}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={color.dim} multiline={multiline} style={[styles.field, multiline && styles.multiline]} /></View>
}

export function Badge({ value, onDark }: { value: string; onDark?: boolean }) {
  const normalized = value.toLowerCase(); const good = ['active', 'approved', 'met', 'passed', 'acknowledged', 'disbursed'].includes(normalized)
  if (onDark) return <Text style={[styles.badge, { color: color.card, borderColor: 'rgba(244,245,240,.42)', backgroundColor: 'rgba(244,245,240,.14)' }]}>{value.replaceAll('_', ' ').toUpperCase()}</Text>
  return <Text style={[styles.badge, { color: good ? color.green : color.maroon, borderColor: good ? `${color.green}55` : `${color.maroon}44` }]}>{value.replaceAll('_', ' ').toUpperCase()}</Text>
}

export function Loading() { return <View style={styles.center}><ActivityIndicator color={color.maroon} /></View> }
export function Empty({ title, body }: { title: string; body: string }) { return <View style={styles.empty}><Ionicons name="folder-open-outline" size={25} color={color.maroon} /><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionBody}>{body}</Text></View> }
export function dateLabel(value?: string | null) { const d = new Date(String(value ?? '')); return Number.isNaN(d.getTime()) ? 'To be announced' : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.white }, content: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 120 }, grow: { flex: 1 }, center: { minHeight: 180, justifyContent: 'center', alignItems: 'center' },
  header: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }, back: { width: 38, height: 38, borderRadius: 19, backgroundColor: color.cloud, borderWidth: 1, borderColor: color.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.extraBold, fontSize: 24, lineHeight: 27, letterSpacing: -.8, color: color.ink }, subtitle: { fontFamily: font.bold, fontSize: 8.5, letterSpacing: 2.1, color: color.muted, marginTop: 6 },
  sectionTitle: { fontFamily: font.bold, fontSize: 14, color: color.ink, marginTop: 22, marginBottom: 10 }, card: { padding: 16, backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: 18, marginBottom: 10 },
  action: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, marginBottom: 10, backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: 18 }, actionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: color.cloud }, actionTitle: { fontFamily: font.bold, fontSize: 11.5, color: color.ink }, actionBody: { fontFamily: font.regular, fontSize: 8.7, lineHeight: 13, color: color.muted, marginTop: 4 },
  button: { minHeight: 51, borderRadius: 15, backgroundColor: color.maroon, alignItems: 'center', justifyContent: 'center', marginTop: 12 }, buttonSecondary: { backgroundColor: color.card, borderWidth: 1, borderColor: color.maroon }, disabled: { opacity: .45 }, buttonText: { fontFamily: font.extraBold, fontSize: 8, letterSpacing: 1.1, color: color.card }, buttonSecondaryText: { color: color.maroon },
  fieldWrap: { marginBottom: 13 }, label: { fontFamily: font.bold, fontSize: 8, letterSpacing: .7, color: color.muted, marginBottom: 6 }, field: { minHeight: 48, borderRadius: 13, paddingHorizontal: 13, backgroundColor: color.card, borderWidth: 1, borderColor: color.border, fontFamily: font.regular, fontSize: 11, color: color.ink }, multiline: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' }, badge: { alignSelf: 'flex-start', fontFamily: font.bold, fontSize: 7, letterSpacing: .7, borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 }, empty: { minHeight: 165, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, metric: { fontFamily: font.extraBold, fontSize: 22, color: color.ink }, metricLabel: { fontFamily: font.regular, fontSize: 8.5, color: color.muted, marginTop: 2 }, body: { fontFamily: font.regular, fontSize: 10, lineHeight: 16, color: color.muted },
})
