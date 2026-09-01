import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { format } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { font } from '../constants/fonts'
import { getMemberPortal, PortalActivity } from '../api/memberPortal'
import {
  AnnouncementDTO,
  askPerformanceQuestion,
  deleteMemberDocument,
  EquipmentLoanDTO,
  getActivities,
  getActivity,
  getAnnouncements,
  getAttendance,
  getCalendarFile,
  getEquipmentLoans,
  getEquipmentLoan,
  getMemberDocuments,
  getMemberRequests,
  getScholarship,
  getScholarshipHistory,
  MemberDocumentDTO,
  MemberRequestDTO,
  reportEquipmentIssue,
  requestAbsence,
  requestAttendanceCorrection,
  requestScholarshipRenewal,
  ScholarshipSummary,
  submitLeaveRequest,
  uploadMemberDocument,
} from '../api/memberServices'

const INK = '#101528'
const PURPLE = '#6749C8'
const BLUE = '#385DA6'
const GREEN = '#1B8C37'
const GOLD = '#946F04'
const RED = '#A64208'
const MUTED = '#676C85'
const DIM = '#8A8FA6'
const BORDER = 'rgba(16,21,40,.09)'
const PAPER = '#FFFFFF'

type HubView = 'overview' | 'records' | 'requests'
type ActionKind = 'question' | 'absence' | 'correction' | 'equipment' | 'leave' | 'document' | null

type ActionTarget = {
  id: string
  title: string
  activity?: PortalActivity
  loan?: EquipmentLoanDTO
}

type DetailState =
  | { kind: 'activity'; item: PortalActivity & { instructions?: string; mapUrl?: string } }
  | { kind: 'equipment'; item: EquipmentLoanDTO }
  | null

function statusColor(status?: string | null) {
  const normalized = String(status ?? '').toLowerCase()
  if (['active', 'approved', 'resolved', 'met', 'acknowledged', 'paid'].includes(normalized)) return GREEN
  if (['rejected', 'suspended', 'expired', 'overdue'].includes(normalized)) return RED
  return GOLD
}

function formattedDate(value: unknown, pattern: string, fallback = 'Date unavailable') {
  const parsed = new Date(String(value ?? ''))
  return Number.isNaN(parsed.getTime()) ? fallback : format(parsed, pattern)
}

async function shareFile(name: string, content: string, mimeType: string) {
  if (Platform.OS === 'web') {
    await Share.share({ title: name, message: content })
    return
  }
  const uri = `${FileSystem.cacheDirectory}${name}`
  await FileSystem.writeAsStringAsync(uri, content)
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType, dialogTitle: `Share ${name}` })
  else await Share.share({ title: name, message: content })
}

function previewMode() {
  return __DEV__ && Platform.OS === 'web' && typeof window !== 'undefined' && window.location.search.includes('preview=member')
}

const previewScholarship: ScholarshipSummary = {
  status: 'active',
  awardType: 'GYOCC Member Scholarship',
  startDate: '2026-01-01T00:00:00.000Z',
  renewalDate: '2027-01-01T00:00:00.000Z',
  attendanceRequirement: 80,
  currentAttendanceRate: 87,
  requirements: [
    { key: 'attendance', label: 'Maintain at least 80% attendance', status: 'met' },
    { key: 'active_membership', label: 'Remain an active GYOCC member', status: 'met' },
    { key: 'documents', label: 'Keep scholarship documents current', status: 'review' },
  ],
}

export default function MemberHubScreen({ navigation }: { navigation: { navigate: (name: string) => void } }) {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const [view, setView] = useState<HubView>('overview')
  const [action, setAction] = useState<ActionKind>(null)
  const [target, setTarget] = useState<ActionTarget | null>(null)
  const [message, setMessage] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [documentType, setDocumentType] = useState('School enrollment proof')
  const [detail, setDetail] = useState<DetailState>(null)
  const [refreshing, setRefreshing] = useState(false)
  const preview = previewMode()

  const portal = useQuery({ queryKey: ['member-portal'], queryFn: getMemberPortal })
  const scholarship = useQuery({ queryKey: ['member-scholarship'], queryFn: () => preview ? Promise.resolve(previewScholarship) : getScholarship(), retry: false })
  const scholarshipHistory = useQuery({ queryKey: ['member-scholarship-history'], queryFn: () => preview ? Promise.resolve({ scholarships: [{ _id: 'sch1', awardType: 'GYOCC Member Scholarship', status: 'active', startDate: '2026-01-01T00:00:00.000Z', renewalDate: '2027-01-01T00:00:00.000Z' }] }) : getScholarshipHistory(), retry: false })
  const announcements = useQuery({ queryKey: ['member-announcements'], queryFn: () => preview ? Promise.resolve({ announcements: [{ _id: 'a1', title: 'Full ensemble call this Saturday', body: 'Please bring your concert attire and arrive 30 minutes before call time.', audience: 'All', priority: 'important', publishedAt: new Date().toISOString() } as AnnouncementDTO] }) : getAnnouncements(), retry: false })
  const activities = useQuery({ queryKey: ['member-activities', 'all'], queryFn: () => preview ? Promise.resolve({ activities: portal.data?.upcoming ?? [], total: portal.data?.upcoming.length ?? 0, page: 1, pages: 1 }) : getActivities({ limit: 50 }), retry: false })
  const attendance = useQuery({ queryKey: ['member-attendance-records'], queryFn: () => preview ? Promise.resolve({ records: [] }) : getAttendance({ year: new Date().getFullYear() }), retry: false })
  const equipment = useQuery({ queryKey: ['member-equipment-loans'], queryFn: () => preview ? Promise.resolve({ loans: [{ _id: 'eq1', equipmentName: 'Yamaha Violin', qtyBorrowed: 1, dateBorrowed: '2026-02-04T00:00:00.000Z', expectedReturnDate: '2026-12-20T00:00:00.000Z', conditionOnLoan: 'Excellent', purpose: 'GYOCC rehearsals and performances', venue: 'GYOCC Center' }] }) : getEquipmentLoans(), retry: false })
  const documents = useQuery({ queryKey: ['member-documents'], queryFn: () => preview ? Promise.resolve({ documents: [{ _id: 'd1', documentType: 'Parent consent', originalName: 'consent-form.pdf', url: '', mimeType: 'application/pdf', size: 204800, status: 'approved', createdAt: '2026-01-12T00:00:00.000Z' } as MemberDocumentDTO] }) : getMemberDocuments(), retry: false })
  const requests = useQuery({ queryKey: ['member-requests'], queryFn: () => preview ? Promise.resolve({ requests: [] }) : getMemberRequests(), retry: false })

  const upcoming = useMemo(() => [...(portal.data?.upcoming ?? [])].sort((a, b) => +new Date(a.date) - +new Date(b.date)), [portal.data?.upcoming])
  const pastActivities = useMemo(() => (activities.data?.activities ?? []).filter((item) => new Date(item.date) < new Date()).slice(0, 8), [activities.data])
  const openLoans = (equipment.data?.loans ?? []).filter((item) => !item.actualReturnDate)
  const pendingRequests = (requests.data?.requests ?? []).filter((item) => item.status === 'pending').length

  const refresh = async () => {
    setRefreshing(true)
    try { await Promise.all([portal.refetch(), scholarship.refetch(), scholarshipHistory.refetch(), announcements.refetch(), activities.refetch(), attendance.refetch(), equipment.refetch(), documents.refetch(), requests.refetch()]) }
    finally { setRefreshing(false) }
  }

  const closeAction = () => { setAction(null); setTarget(null); setMessage(''); setStartDate(''); setEndDate('') }
  const openAction = (kind: Exclude<ActionKind, null>, nextTarget?: ActionTarget) => { setAction(kind); setTarget(nextTarget ?? null); setMessage('') }

  const submitAction = useMutation({
    mutationFn: async () => {
      if (preview) return
      if (action === 'question' && target?.activity) return askPerformanceQuestion(target.activity.type, target.activity.sourceId, message)
      if (action === 'absence' && target?.activity) return requestAbsence({ activityType: target.activity.type, activityId: target.activity.sourceId, reason: message, category: 'other', isEmergency: false, signerType: 'self', signerName: portal.data?.member.name || 'Member', documentIds: [] })
      if (action === 'correction' && target) return requestAttendanceCorrection(target.id, message)
      if (action === 'equipment' && target?.loan) return reportEquipmentIssue(target.loan._id, message)
      if (action === 'leave') return submitLeaveRequest(startDate, endDate, message)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['member-requests'] })
      Toast.show({ type: 'success', text1: 'Request submitted', text2: 'Your coordinator can now review it.' })
      closeAction()
    },
    onError: (error: { message?: string }) => Toast.show({ type: 'error', text1: 'Could not submit request', text2: error.message }),
  })

  const renewal = useMutation({
    mutationFn: async () => { if (!preview) await requestScholarshipRenewal() },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['member-requests'] }); Toast.show({ type: 'success', text1: 'Renewal request sent' }) },
    onError: (error: { message?: string }) => Toast.show({ type: 'error', text1: 'Renewal unavailable', text2: error.message }),
  })

  const uploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true })
      if (result.canceled || !result.assets[0]) return
      const asset = result.assets[0]
      if (asset.size && asset.size > 10 * 1024 * 1024) throw new Error('Choose a file smaller than 10 MB')
      if (!preview) await uploadMemberDocument({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/pdf', documentType: documentType.trim() || 'Member document' })
      await queryClient.invalidateQueries({ queryKey: ['member-documents'] })
      Toast.show({ type: 'success', text1: 'Document submitted', text2: 'You can track its review status here.' })
      closeAction()
    } catch (error) { Toast.show({ type: 'error', text1: 'Upload failed', text2: (error as Error).message }) }
  }

  const removeDocument = (item: MemberDocumentDTO) => Alert.alert('Remove document?', item.originalName, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => { try { if (!preview) await deleteMemberDocument(item._id); await queryClient.invalidateQueries({ queryKey: ['member-documents'] }) } catch (error) { Toast.show({ type: 'error', text1: 'Could not remove document', text2: (error as Error).message }) } } },
  ])

  const exportCalendar = async () => {
    try {
      const content = preview ? 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR' : await getCalendarFile()
      await shareFile('gyocc-calendar.ics', content, 'text/calendar')
    } catch (error) { Toast.show({ type: 'error', text1: 'Calendar export failed', text2: (error as Error).message }) }
  }

  const openActivityDetail = async (item: PortalActivity) => {
    try {
      const resolved = preview ? { activity: { ...item, instructions: item.type === 'rehearsal' ? 'Bring your music folder, pencil and concert attire.' : 'Final call details from your coordinator.' } } : await getActivity(item.type, item.sourceId)
      setDetail({ kind: 'activity', item: resolved.activity })
    } catch (error) { Toast.show({ type: 'error', text1: 'Details unavailable', text2: (error as Error).message }) }
  }

  const openEquipmentDetail = async (item: EquipmentLoanDTO) => {
    try {
      const resolved = preview ? { loan: item } : await getEquipmentLoan(item._id)
      setDetail({ kind: 'equipment', item: resolved.loan })
    } catch (error) { Toast.show({ type: 'error', text1: 'Equipment details unavailable', text2: (error as Error).message }) }
  }

  const loading = portal.isLoading || scholarship.isLoading
  if (loading) return <View style={styles.center}><ActivityIndicator color={PURPLE} /><Text style={styles.loadingText}>Preparing your member hub…</Text></View>

  const scholarshipData = scholarship.data ?? previewScholarship
  return <ScrollView
    style={styles.screen}
    contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={PURPLE} />}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.header}><View><Text style={styles.pageTitle}>Member Hub</Text><Text style={styles.subtitle}>Scholarship, records & support</Text></View><TouchableOpacity style={styles.inboxButton} onPress={() => navigation.navigate('Inbox')}><Ionicons name="notifications-outline" size={20} color={PURPLE} /></TouchableOpacity></View>

    <ScholarshipHero data={scholarshipData} onRenew={() => renewal.mutate()} busy={renewal.isPending} />

    <View style={styles.quickGrid}>
      <QuickAction icon="calendar-outline" label="Export calendar" tint="#EEE9FF" color={PURPLE} onPress={exportCalendar} />
      <QuickAction icon="document-attach-outline" label="Add document" tint="#E8F4FF" color={BLUE} onPress={() => openAction('document')} />
      <QuickAction icon="airplane-outline" label="Request leave" tint="#FFF2E8" color={RED} onPress={() => openAction('leave')} />
      <QuickAction icon="chatbubble-ellipses-outline" label="My requests" tint="#EAF7ED" color={GREEN} onPress={() => setView('requests')} badge={pendingRequests} />
    </View>

    <Segment value={view} onChange={setView} />

    {view === 'overview' ? <>
      <SectionHeader title="Scholarship standing" caption={`${scholarshipData.currentAttendanceRate}% attendance`} />
      <View style={styles.card}>{scholarshipData.requirements.map((item) => <RequirementRow key={item.key} label={item.label} status={item.status} />)}</View>

      <SectionHeader title="Announcements" caption={`${announcements.data?.announcements.length ?? 0} current`} />
      {(announcements.data?.announcements ?? []).length ? (announcements.data?.announcements ?? []).slice(0, 4).map((item) => <AnnouncementCard key={item._id} item={item} />) : <EmptyCard icon="megaphone-outline" title="You’re all caught up" body="New orchestra and choir notices will appear here." />}

      <SectionHeader title="Upcoming calls" caption={`${upcoming.length} scheduled`} />
      {upcoming.slice(0, 5).map((item) => <CallCard key={`${item.type}-${item.sourceId}`} item={item} onDetail={() => void openActivityDetail(item)} onQuestion={() => openAction('question', { id: item.sourceId, title: item.title, activity: item })} onAbsence={() => openAction('absence', { id: item.sourceId, title: item.title, activity: item })} />)}
      {!upcoming.length ? <EmptyCard icon="checkmark-circle-outline" title="Your schedule is clear" body="Published calls and assignments will appear here." /> : null}
    </> : null}

    {view === 'records' ? <>
      <SectionHeader title="Scholarship history" caption={`${scholarshipHistory.data?.scholarships.length ?? 0} award record`} />
      <View style={styles.card}>{(scholarshipHistory.data?.scholarships ?? []).map((raw, index) => { const item = raw as { _id?: string; awardType?: string; status?: string; startDate?: string; renewalDate?: string }; return <View key={item._id || String(index)} style={styles.recordRow}><View style={[styles.recordIcon, { backgroundColor: '#EEE9FF' }]}><Ionicons name="school-outline" size={18} color={PURPLE} /></View><View style={styles.flex}><Text style={styles.rowTitle}>{item.awardType || 'GYOCC Member Scholarship'}</Text><Text style={styles.rowMeta}>{item.startDate ? `Started ${formattedDate(item.startDate, 'MMM d, yyyy')}` : 'Award record'}</Text></View><StatusPill status={item.status || 'review'} /></View> })}{!(scholarshipHistory.data?.scholarships.length) ? <InlineEmpty text="Formal scholarship awards will appear here." /> : null}</View>

      <SectionHeader title="Attendance history" caption={`${portal.data?.attendance.attendanceRate ?? 0}% overall`} />
      <View style={styles.card}>{(attendance.data?.records ?? []).slice(0, 8).map((item, index) => <View key={item._id || String(index)} style={styles.recordRow}><View style={[styles.recordIcon, { backgroundColor: '#EDF8EF' }]}><Ionicons name="checkmark-done-outline" size={18} color={statusColor(item.status)} /></View><View style={styles.flex}><Text style={styles.rowTitle}>{formattedDate(item.scheduledStartAt, 'MMM d · h:mm a')}</Text><Text style={[styles.rowMeta, { color: statusColor(item.status) }]}>{String(item.status || 'Pending').toUpperCase()} · {String(item.sourceType || 'activity').toUpperCase()}</Text></View>{item._id ? <TouchableOpacity style={styles.miniButton} onPress={() => openAction('correction', { id: item._id, title: 'Attendance record' })}><Text style={styles.miniButtonText}>CORRECT</Text></TouchableOpacity> : null}</View>)}{!(attendance.data?.records.length) ? <InlineEmpty text="Detailed attendance records will appear after your next call." /> : null}</View>

      <SectionHeader title="Equipment in your care" caption={`${openLoans.length} active`} />
      {openLoans.map((loan) => <EquipmentCard key={loan._id} loan={loan} onDetail={() => void openEquipmentDetail(loan)} onReport={() => openAction('equipment', { id: loan._id, title: loan.equipmentName, loan })} />)}
      {!openLoans.length ? <EmptyCard icon="musical-notes-outline" title="No active equipment loans" body="Items assigned to you will appear here with their return details." /> : null}

      <SectionHeader title="Member documents" caption={`${documents.data?.documents.length ?? 0} submitted`} action="ADD" onAction={() => openAction('document')} />
      <View style={styles.card}>{(documents.data?.documents ?? []).map((item) => <TouchableOpacity key={item._id} style={styles.recordRow} onLongPress={() => item.status !== 'approved' && removeDocument(item)}><View style={[styles.recordIcon, { backgroundColor: '#EEE9FF' }]}><Ionicons name={item.mimeType === 'application/pdf' ? 'document-text-outline' : 'image-outline'} size={18} color={PURPLE} /></View><View style={styles.flex}><Text style={styles.rowTitle}>{item.documentType}</Text><Text style={styles.rowMeta} numberOfLines={1}>{item.originalName}</Text></View><StatusPill status={item.status} /></TouchableOpacity>)}{!(documents.data?.documents.length) ? <InlineEmpty text="No member documents submitted." /> : null}</View>

      <SectionHeader title="Performance archive" caption={`${pastActivities.length} recent`} />
      <View style={styles.card}>{pastActivities.map((item) => <TouchableOpacity key={`${item.type}-${item.sourceId}`} style={styles.recordRow} onPress={() => void openActivityDetail(item)}><View style={[styles.recordIcon, { backgroundColor: '#E8F4FF' }]}><Ionicons name="musical-notes-outline" size={18} color={BLUE} /></View><View style={styles.flex}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.rowMeta}>{format(new Date(item.date), 'MMM d, yyyy')} · {item.role}</Text></View><StatusPill status={item.attendanceStatus || item.status} /><Ionicons name="chevron-forward" size={15} color={DIM} /></TouchableOpacity>)}{!pastActivities.length ? <InlineEmpty text="Completed performances will appear here." /> : null}</View>
    </> : null}

    {view === 'requests' ? <>
      <SectionHeader title="Requests & support" caption={`${pendingRequests} pending`} />
      {(requests.data?.requests ?? []).map((item) => <RequestCard key={item._id} item={item} />)}
      {!(requests.data?.requests.length) ? <EmptyCard icon="chatbubbles-outline" title="No requests yet" body="Attendance corrections, leave, scholarship renewal and support requests will be tracked here." /> : null}
    </> : null}

    <ActionSheet action={action} target={target} message={message} setMessage={setMessage} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} documentType={documentType} setDocumentType={setDocumentType} busy={submitAction.isPending} onClose={closeAction} onSubmit={() => submitAction.mutate()} onUpload={uploadDocument} />
    <DetailSheet detail={detail} onClose={() => setDetail(null)} onQuestion={(item) => { setDetail(null); openAction('question', { id: item.sourceId, title: item.title, activity: item }) }} onEquipmentIssue={(item) => { setDetail(null); openAction('equipment', { id: item._id, title: item.equipmentName, loan: item }) }} />
  </ScrollView>
}

function ScholarshipHero({ data, onRenew, busy }: { data: ScholarshipSummary; onRenew: () => void; busy: boolean }) {
  const active = data.status === 'active'
  return <LinearGradient colors={active ? ['#7447E6', '#5032BF', '#211B6D'] : ['#D4862E', '#9B5B22', '#593513']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
    <View style={styles.heroTop}><View style={styles.heroTag}><View style={[styles.heroDot, { backgroundColor: active ? '#8FF0B1' : '#FFE08A' }]} /><Text style={styles.heroTagText}>{data.status.toUpperCase()}</Text></View><Ionicons name="school-outline" size={28} color="rgba(255,255,255,.85)" /></View>
    <Text style={styles.heroTitle}>{data.awardType}</Text>
    <Text style={styles.heroBody}>{active ? 'You’re in good standing. Keep showing up, growing and making music.' : 'Your scholarship needs attention. Review the requirements below.'}</Text>
    <View style={styles.heroFooter}><View><Text style={styles.heroLabel}>RENEWAL</Text><Text style={styles.heroValue}>{data.renewalDate ? format(new Date(data.renewalDate), 'MMM d, yyyy') : 'To be announced'}</Text></View><TouchableOpacity disabled={busy} style={styles.heroButton} onPress={onRenew}><Text style={styles.heroButtonText}>{busy ? 'SENDING…' : 'REQUEST RENEWAL'}</Text></TouchableOpacity></View>
  </LinearGradient>
}

function QuickAction({ icon, label, tint, color, onPress, badge }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; tint: string; color: string; onPress: () => void; badge?: number }) {
  return <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={.72}><View style={[styles.quickIcon, { backgroundColor: tint }]}><Ionicons name={icon} size={21} color={color} />{badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View> : null}</View><Text style={styles.quickLabel}>{label}</Text></TouchableOpacity>
}

function Segment({ value, onChange }: { value: HubView; onChange: (value: HubView) => void }) {
  return <View style={styles.segment}>{(['overview', 'records', 'requests'] as HubView[]).map((item) => <TouchableOpacity key={item} style={[styles.segmentItem, value === item && styles.segmentActive]} onPress={() => onChange(item)}><Text style={[styles.segmentText, value === item && styles.segmentTextActive]}>{item.toUpperCase()}</Text></TouchableOpacity>)}</View>
}

function SectionHeader({ title, caption, action, onAction }: { title: string; caption?: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>{title}</Text>{caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}</View>{action ? <TouchableOpacity onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></TouchableOpacity> : null}</View>
}

function RequirementRow({ label, status }: { label: string; status: string }) {
  const color = statusColor(status)
  return <View style={styles.requirementRow}><View style={[styles.requirementIcon, { backgroundColor: `${color}15` }]}><Ionicons name={status === 'met' ? 'checkmark' : status === 'attention' ? 'alert' : 'hourglass-outline'} size={15} color={color} /></View><Text style={styles.requirementLabel}>{label}</Text><Text style={[styles.requirementStatus, { color }]}>{status === 'met' ? 'MET' : status.toUpperCase()}</Text></View>
}

function AnnouncementCard({ item }: { item: AnnouncementDTO }) {
  const color = item.priority === 'urgent' ? RED : item.priority === 'important' ? GOLD : PURPLE
  return <View style={[styles.announcement, { borderLeftColor: color }]}><View style={styles.announcementTop}><Text style={[styles.announcementPriority, { color }]}>{item.priority.toUpperCase()}</Text><Text style={styles.announcementDate}>{format(new Date(item.publishedAt), 'MMM d')}</Text></View><Text style={styles.announcementTitle}>{item.title}</Text><Text style={styles.announcementBody}>{item.body}</Text></View>
}

function CallCard({ item, onDetail, onQuestion, onAbsence }: { item: PortalActivity; onDetail: () => void; onQuestion: () => void; onAbsence: () => void }) {
  return <View style={styles.callCard}><TouchableOpacity style={styles.callDate} onPress={onDetail}><Text style={styles.callMonth}>{format(new Date(item.date), 'MMM').toUpperCase()}</Text><Text style={styles.callDay}>{format(new Date(item.date), 'dd')}</Text></TouchableOpacity><View style={styles.flex}><TouchableOpacity onPress={onDetail}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.rowMeta}>{format(new Date(item.date), 'h:mm a')} · {item.venueName || 'Venue TBA'}</Text><Text style={styles.callRole}>{item.type.toUpperCase()} · {item.role}</Text></TouchableOpacity><View style={styles.inlineActions}><TouchableOpacity onPress={onDetail}><Text style={styles.inlineAction}>VIEW DETAILS</Text></TouchableOpacity><TouchableOpacity onPress={onQuestion}><Text style={styles.inlineAction}>ASK</Text></TouchableOpacity><TouchableOpacity onPress={onAbsence}><Text style={[styles.inlineAction, { color: RED }]}>ABSENCE</Text></TouchableOpacity></View></View></View>
}

function EquipmentCard({ loan, onDetail, onReport }: { loan: EquipmentLoanDTO; onDetail: () => void; onReport: () => void }) {
  const overdue = Boolean(loan.expectedReturnDate && new Date(loan.expectedReturnDate) < new Date())
  return <View style={styles.equipmentCard}><TouchableOpacity style={styles.equipmentArt} onPress={onDetail}><Ionicons name="musical-notes" size={25} color={BLUE} /></TouchableOpacity><TouchableOpacity style={styles.flex} onPress={onDetail}><Text style={styles.rowTitle}>{loan.equipmentName}</Text><Text style={styles.rowMeta}>{loan.conditionOnLoan} condition · Qty {loan.qtyBorrowed}</Text><Text style={[styles.equipmentDue, { color: overdue ? RED : GREEN }]}>{loan.expectedReturnDate ? `${overdue ? 'OVERDUE' : 'DUE'} ${format(new Date(loan.expectedReturnDate), 'MMM d, yyyy')}` : 'NO RETURN DATE'}</Text></TouchableOpacity><TouchableOpacity style={styles.reportButton} onPress={onReport}><Ionicons name="alert-circle-outline" size={18} color={RED} /></TouchableOpacity></View>
}

function RequestCard({ item }: { item: MemberRequestDTO }) {
  return <View style={styles.requestCard}><View style={styles.requestTop}><Text style={styles.requestType}>{item.type.replaceAll('_', ' ').toUpperCase()}</Text><StatusPill status={item.status} /></View><Text style={styles.requestTitle}>{item.subject}</Text><Text style={styles.requestBody} numberOfLines={3}>{item.message}</Text>{item.response ? <View style={styles.responseBox}><Text style={styles.responseLabel}>COORDINATOR RESPONSE</Text><Text style={styles.responseText}>{item.response}</Text></View> : null}<Text style={styles.requestDate}>Submitted {format(new Date(item.createdAt), 'MMM d, yyyy · h:mm a')}</Text></View>
}

function StatusPill({ status }: { status: string }) {
  const color = statusColor(status)
  return <Text style={[styles.statusPill, { color, borderColor: `${color}55`, backgroundColor: `${color}0D` }]}>{status.toUpperCase()}</Text>
}

function EmptyCard({ icon, title, body }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string }) {
  return <View style={styles.emptyCard}><View style={styles.emptyIcon}><Ionicons name={icon} size={24} color={PURPLE} /></View><View style={styles.flex}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text></View></View>
}

function InlineEmpty({ text }: { text: string }) { return <Text style={styles.inlineEmpty}>{text}</Text> }

function DetailSheet({ detail, onClose, onQuestion, onEquipmentIssue }: { detail: DetailState; onClose: () => void; onQuestion: (item: PortalActivity) => void; onEquipmentIssue: (item: EquipmentLoanDTO) => void }) {
  if (!detail) return null
  const activity = detail.kind === 'activity' ? detail.item : null
  const loan = detail.kind === 'equipment' ? detail.item : null
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.handle} /><View style={styles.sheetHeader}><View style={styles.flex}><Text style={styles.sheetEyebrow}>{activity ? activity.type.toUpperCase() : 'EQUIPMENT IN YOUR CARE'}</Text><Text style={styles.sheetTitle}>{activity?.title || loan?.equipmentName}</Text><Text style={styles.sheetSubtitle}>{activity ? `${format(new Date(activity.date), 'EEEE, MMMM d · h:mm a')} · ${activity.role}` : `${loan?.conditionOnLoan} condition · Quantity ${loan?.qtyBorrowed}`}</Text></View><TouchableOpacity style={styles.closeButton} onPress={onClose}><Ionicons name="close" size={20} color={INK} /></TouchableOpacity></View>
    <View style={styles.detailGrid}>
      {activity ? <><DetailLine icon="location-outline" label="VENUE" value={[activity.venueName, activity.venueAddress].filter(Boolean).join(' · ') || 'To be announced'} /><DetailLine icon="time-outline" label="SCHEDULE" value={`${format(new Date(activity.date), 'h:mm a')}${activity.endDate ? ` – ${format(new Date(activity.endDate), 'h:mm a')}` : ''}`} /><DetailLine icon="checkmark-circle-outline" label="STATUS" value={`${activity.confirmation || activity.status} · ${activity.attendanceStatus || 'Attendance pending'}`} />{activity.instructions ? <DetailLine icon="information-circle-outline" label="MEMBER INSTRUCTIONS" value={activity.instructions} /> : null}</> : null}
      {loan ? <><DetailLine icon="calendar-outline" label="BORROWED" value={format(new Date(loan.dateBorrowed), 'MMMM d, yyyy')} /><DetailLine icon="return-down-back-outline" label="EXPECTED RETURN" value={loan.expectedReturnDate ? format(new Date(loan.expectedReturnDate), 'MMMM d, yyyy') : 'No return date'} /><DetailLine icon="information-circle-outline" label="PURPOSE" value={loan.purpose || 'GYOCC activity'} /><DetailLine icon="location-outline" label="ISSUED AT" value={loan.venue || 'GYOCC'} /></> : null}
    </View>
    <TouchableOpacity style={styles.submitButton} onPress={() => activity ? onQuestion(activity) : loan && onEquipmentIssue(loan)}><Ionicons name={activity ? 'chatbubble-ellipses-outline' : 'alert-circle-outline'} size={18} color="#fff" /><Text style={styles.submitText}>{activity ? 'ASK YOUR COORDINATOR' : 'REPORT AN ISSUE'}</Text></TouchableOpacity>
  </View></View></Modal>
}

function DetailLine({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return <View style={styles.detailLine}><View style={styles.detailIcon}><Ionicons name={icon} size={18} color={PURPLE} /></View><View style={styles.flex}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View></View>
}

function ActionSheet(props: {
  action: ActionKind
  target: ActionTarget | null
  message: string
  setMessage: (value: string) => void
  startDate: string
  setStartDate: (value: string) => void
  endDate: string
  setEndDate: (value: string) => void
  documentType: string
  setDocumentType: (value: string) => void
  busy: boolean
  onClose: () => void
  onSubmit: () => void
  onUpload: () => void
}) {
  if (!props.action) return null
  const titles: Record<Exclude<ActionKind, null>, string> = { question: 'Ask your coordinator', absence: 'Report an absence', correction: 'Request a correction', equipment: 'Report equipment issue', leave: 'Request member leave', document: 'Submit a document' }
  const placeholders: Record<Exclude<ActionKind, null>, string> = { question: 'What would you like to clarify?', absence: 'Tell us why you cannot attend…', correction: 'Explain what should be corrected…', equipment: 'Describe the issue or damage…', leave: 'Reason for your leave request…', document: '' }
  const valid = props.action === 'document' ? Boolean(props.documentType.trim()) : props.action === 'leave' ? Boolean(props.message.trim() && props.startDate.trim() && props.endDate.trim()) : Boolean(props.message.trim())
  return <Modal visible transparent animationType="slide" onRequestClose={props.onClose}><KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.sheet}><View style={styles.handle} /><View style={styles.sheetHeader}><View style={styles.flex}><Text style={styles.sheetEyebrow}>MEMBER SELF-SERVICE</Text><Text style={styles.sheetTitle}>{titles[props.action]}</Text>{props.target ? <Text style={styles.sheetSubtitle}>{props.target.title}</Text> : null}</View><TouchableOpacity style={styles.closeButton} onPress={props.onClose}><Ionicons name="close" size={20} color={INK} /></TouchableOpacity></View>
    {props.action === 'document' ? <><Text style={styles.fieldLabel}>DOCUMENT TYPE</Text><TextInput style={styles.input} value={props.documentType} onChangeText={props.setDocumentType} placeholder="e.g. School enrollment proof" placeholderTextColor={DIM} /><Text style={styles.helper}>Accepted: PDF, JPEG, PNG or WebP · Maximum 10 MB</Text><TouchableOpacity disabled={!valid} style={[styles.submitButton, !valid && styles.disabled]} onPress={props.onUpload}><Ionicons name="cloud-upload-outline" size={19} color="#fff" /><Text style={styles.submitText}>CHOOSE FILE & SUBMIT</Text></TouchableOpacity></> : <>
      {props.action === 'leave' ? <View style={styles.dateInputs}><View style={styles.flex}><Text style={styles.fieldLabel}>START DATE</Text><TextInput style={styles.input} value={props.startDate} onChangeText={props.setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={DIM} /></View><View style={styles.flex}><Text style={styles.fieldLabel}>END DATE</Text><TextInput style={styles.input} value={props.endDate} onChangeText={props.setEndDate} placeholder="YYYY-MM-DD" placeholderTextColor={DIM} /></View></View> : null}
      <Text style={styles.fieldLabel}>{props.action === 'question' ? 'YOUR QUESTION' : 'DETAILS'}</Text><TextInput style={[styles.input, styles.textArea]} value={props.message} onChangeText={props.setMessage} multiline placeholder={placeholders[props.action]} placeholderTextColor={DIM} textAlignVertical="top" /><Text style={styles.helper}>Your coordinator will see this in the administrative review queue.</Text><TouchableOpacity disabled={!valid || props.busy} style={[styles.submitButton, (!valid || props.busy) && styles.disabled]} onPress={props.onSubmit}><Text style={styles.submitText}>{props.busy ? 'SUBMITTING…' : 'SUBMIT REQUEST'}</Text></TouchableOpacity>
    </>}
  </View></KeyboardAvoidingView></Modal>
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FCFBFE' },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  center: { flex: 1, backgroundColor: '#FCFBFE', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: font.medium, fontSize: 11, color: MUTED },
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  pageTitle: { fontFamily: font.extraBold, fontSize: 28, letterSpacing: -.7, color: INK },
  subtitle: { fontFamily: font.regular, fontSize: 10.5, color: MUTED, marginTop: 3 },
  inboxButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F0EBFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(103,73,200,.12)' },
  hero: { borderRadius: 24, padding: 20, minHeight: 224, shadowColor: '#39228A', shadowOpacity: .22, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  heroDot: { width: 6, height: 6, borderRadius: 3 },
  heroTagText: { fontFamily: font.bold, fontSize: 7.5, letterSpacing: 1.6, color: '#fff' },
  heroTitle: { fontFamily: font.extraBold, fontSize: 23, lineHeight: 27, letterSpacing: -.4, color: '#fff', marginTop: 22 },
  heroBody: { fontFamily: font.regular, fontSize: 10.5, lineHeight: 16, color: 'rgba(255,255,255,.7)', marginTop: 7, maxWidth: '90%' },
  heroFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 24 },
  heroLabel: { fontFamily: font.bold, fontSize: 6.5, letterSpacing: 1.4, color: 'rgba(255,255,255,.5)' },
  heroValue: { fontFamily: font.bold, fontSize: 11.5, color: '#fff', marginTop: 4 },
  heroButton: { borderRadius: 11, backgroundColor: '#fff', paddingHorizontal: 13, paddingVertical: 10 },
  heroButtonText: { fontFamily: font.extraBold, fontSize: 7, letterSpacing: 1, color: PURPLE },
  quickGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  quickAction: { width: '23%', alignItems: 'center' },
  quickIcon: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontFamily: font.medium, fontSize: 8.5, lineHeight: 11, textAlign: 'center', color: INK, marginTop: 7 },
  badge: { position: 'absolute', right: -4, top: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: PAPER },
  badgeText: { fontFamily: font.bold, fontSize: 7, color: '#fff' },
  segment: { flexDirection: 'row', padding: 4, backgroundColor: '#F1EFF5', borderRadius: 14, marginTop: 24 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  segmentActive: { backgroundColor: PAPER, shadowColor: INK, shadowOpacity: .08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  segmentText: { fontFamily: font.bold, fontSize: 7.5, letterSpacing: 1.2, color: DIM },
  segmentTextActive: { color: PURPLE },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 25, marginBottom: 10 },
  sectionTitle: { fontFamily: font.bold, fontSize: 15, letterSpacing: -.25, color: INK },
  sectionCaption: { fontFamily: font.regular, fontSize: 8.5, color: DIM, marginTop: 3 },
  sectionAction: { fontFamily: font.bold, fontSize: 7.5, letterSpacing: 1, color: PURPLE, paddingVertical: 4 },
  card: { backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 18, overflow: 'hidden' },
  requirementRow: { minHeight: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  requirementIcon: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  requirementLabel: { flex: 1, fontFamily: font.medium, fontSize: 10.5, color: INK },
  requirementStatus: { fontFamily: font.bold, fontSize: 7, letterSpacing: 1 },
  announcement: { backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderLeftWidth: 4, borderRadius: 17, padding: 16, marginBottom: 9 },
  announcementTop: { flexDirection: 'row', justifyContent: 'space-between' },
  announcementPriority: { fontFamily: font.bold, fontSize: 7, letterSpacing: 1.3 },
  announcementDate: { fontFamily: font.medium, fontSize: 8, color: DIM },
  announcementTitle: { fontFamily: font.bold, fontSize: 13, color: INK, marginTop: 8 },
  announcementBody: { fontFamily: font.regular, fontSize: 9.5, lineHeight: 15, color: MUTED, marginTop: 5 },
  callCard: { backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 14, marginBottom: 9, flexDirection: 'row', gap: 13 },
  callDate: { width: 51, height: 58, borderRadius: 14, backgroundColor: '#F0EBFC', alignItems: 'center', justifyContent: 'center' },
  callMonth: { fontFamily: font.bold, fontSize: 7, letterSpacing: 1.2, color: PURPLE },
  callDay: { fontFamily: font.extraBold, fontSize: 21, lineHeight: 23, color: INK },
  callRole: { fontFamily: font.bold, fontSize: 7, letterSpacing: .9, color: PURPLE, marginTop: 6 },
  inlineActions: { flexDirection: 'row', gap: 15, marginTop: 10 },
  inlineAction: { fontFamily: font.bold, fontSize: 6.7, letterSpacing: .8, color: BLUE },
  recordRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  recordIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: font.bold, fontSize: 11, color: INK },
  rowMeta: { fontFamily: font.regular, fontSize: 8.5, color: MUTED, marginTop: 4, textTransform: 'capitalize' },
  amount: { fontFamily: font.extraBold, fontSize: 11, color: INK },
  miniButton: { borderRadius: 8, borderWidth: 1, borderColor: 'rgba(103,73,200,.25)', paddingHorizontal: 8, paddingVertical: 6 },
  miniButtonText: { fontFamily: font.bold, fontSize: 6, letterSpacing: .7, color: PURPLE },
  statusPill: { fontFamily: font.bold, fontSize: 6.5, letterSpacing: .7, borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5, overflow: 'hidden' },
  equipmentCard: { backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 14, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 12 },
  equipmentArt: { width: 50, height: 58, borderRadius: 15, backgroundColor: '#E8F4FF', alignItems: 'center', justifyContent: 'center' },
  equipmentDue: { fontFamily: font.bold, fontSize: 7, letterSpacing: .7, marginTop: 7 },
  reportButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF0EA', alignItems: 'center', justifyContent: 'center' },
  requestCard: { backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 16, marginBottom: 10 },
  requestTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  requestType: { fontFamily: font.bold, fontSize: 7, letterSpacing: 1.2, color: PURPLE },
  requestTitle: { fontFamily: font.bold, fontSize: 13, color: INK, marginTop: 12 },
  requestBody: { fontFamily: font.regular, fontSize: 9.5, lineHeight: 15, color: MUTED, marginTop: 5 },
  requestDate: { fontFamily: font.medium, fontSize: 7.5, color: DIM, marginTop: 12 },
  responseBox: { backgroundColor: '#F2F8F3', borderRadius: 12, padding: 11, marginTop: 12 },
  responseLabel: { fontFamily: font.bold, fontSize: 6.5, letterSpacing: 1, color: GREEN },
  responseText: { fontFamily: font.regular, fontSize: 9, lineHeight: 14, color: INK, marginTop: 5 },
  emptyCard: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 15 },
  emptyIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#F0EBFC', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: font.bold, fontSize: 11, color: INK },
  emptyBody: { fontFamily: font.regular, fontSize: 9, lineHeight: 14, color: MUTED, marginTop: 4 },
  inlineEmpty: { fontFamily: font.regular, fontSize: 9.5, color: MUTED, padding: 18 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,13,28,.46)' },
  sheet: { backgroundColor: PAPER, borderTopLeftRadius: 27, borderTopRightRadius: 27, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#D6D3DE', alignSelf: 'center', marginBottom: 17 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 },
  sheetEyebrow: { fontFamily: font.bold, fontSize: 7, letterSpacing: 1.5, color: PURPLE },
  sheetTitle: { fontFamily: font.extraBold, fontSize: 21, letterSpacing: -.35, color: INK, marginTop: 5 },
  sheetSubtitle: { fontFamily: font.regular, fontSize: 9.5, color: MUTED, marginTop: 4 },
  closeButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F3F1F6', alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontFamily: font.bold, fontSize: 7, letterSpacing: 1.2, color: MUTED, marginBottom: 7 },
  input: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FAF9FC', paddingHorizontal: 13, fontFamily: font.medium, fontSize: 10.5, color: INK },
  textArea: { minHeight: 112, paddingTop: 13 },
  dateInputs: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  helper: { fontFamily: font.regular, fontSize: 8, lineHeight: 12, color: DIM, marginTop: 8 },
  detailGrid: { gap: 2 },
  detailLine: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  detailIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: '#F0EBFC', alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontFamily: font.bold, fontSize: 6.5, letterSpacing: 1.1, color: DIM },
  detailValue: { fontFamily: font.medium, fontSize: 10.5, lineHeight: 15, color: INK, marginTop: 4 },
  submitButton: { minHeight: 50, borderRadius: 14, backgroundColor: PURPLE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  submitText: { fontFamily: font.extraBold, fontSize: 8, letterSpacing: 1.2, color: '#fff' },
  disabled: { opacity: .42 },
})
