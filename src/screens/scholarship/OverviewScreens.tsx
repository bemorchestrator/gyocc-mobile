import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useQuery } from '@tanstack/react-query'
import { getScholarship, getScholarshipHistory } from '../../api/memberServices'
import { ActionLink, Badge, color, dateLabel, Empty, Header, Loading, Nav, Page, styles } from './Shared'

export default function ScholarshipScreen({ navigation }: { navigation: Nav }) {
  const query = useQuery({ queryKey: ['member-scholarship'], queryFn: getScholarship, retry: false })
  const header = <Header title="Scholarship" subtitle="POLICY-DRIVEN STANDING, REQUESTS AND RELEASES" navigation={navigation} root />
  if (query.isLoading) return <Page header={header}><Loading /></Page>
  if (!query.data) return <Page header={header}><Empty title="Scholarship unavailable" body="Your scholarship workspace could not be loaded." /></Page>
  const data = query.data
  return <Page refreshing={query.isRefetching} onRefresh={() => void query.refetch()} header={header}>
    <LinearGradient colors={data.status === 'active' ? ['#A30020', '#840016', '#4A000D'] : ['#7A3341', '#54202C', '#2E0C15']} locations={[0, .52, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 205, borderRadius: 24, padding: 20, marginTop: 16, marginBottom: 22, justifyContent: 'space-between', shadowColor: '#4A000D', shadowOpacity: .28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 }}>
      <View style={styles.between}><Badge value={data.status} onDark /><Text style={{ color: 'rgba(244,245,240,.72)', fontSize: 10 }}>Policy v{data.policy?.version ?? '—'}</Text></View>
      <Text style={{ color: color.card, fontSize: 23, lineHeight: 28, fontWeight: '800' }}>{data.awardType}</Text>
      <View style={styles.between}><View><Text style={{ color: '#D8CACB', fontSize: 8 }}>QUARTER ATTENDANCE</Text><Text style={{ color: color.card, fontSize: 15, fontWeight: '700' }}>{Math.round(data.currentAttendanceRate)}%</Text></View><View><Text style={{ color: '#D8CACB', fontSize: 8 }}>NEXT REVIEW</Text><Text style={{ color: color.card, fontSize: 12, fontWeight: '700' }}>{dateLabel(data.renewalDate)}</Text></View></View>
    </LinearGradient>
    <ActionLink plain icon="analytics-outline" title="Eligibility & attendance" body="See the current quarter calculation and standing." onPress={() => navigation.navigate('ScholarshipEligibility')} />
    <ActionLink plain icon="document-text-outline" title="Application" body="Apply, renew and manage supporting documents." onPress={() => navigation.navigate('ScholarshipApplication')} />
    <ActionLink plain icon="wallet-outline" title="Awards & payments" body="Review award history and stipend releases." onPress={() => navigation.navigate('ScholarshipAwards')} />
  </Page>
}

export function ScholarshipEligibilityScreen({ navigation }: { navigation: Nav }) {
  const query = useQuery({ queryKey: ['member-scholarship'], queryFn: getScholarship, retry: false })
  const data = query.data
  return <Page refreshing={query.isRefetching} onRefresh={() => void query.refetch()} header={<Header title="Eligibility" subtitle="CURRENT POLICY EVALUATION" navigation={navigation} />}>
    {query.isLoading ? <Loading /> : data ? <>
      <View style={styles.eligibilitySummary}><View style={styles.between}><View><Text style={styles.metric}>{Math.round(data.eligibility?.attendance.percentage ?? 0)}%</Text><Text style={styles.metricLabel}>CREDITED ATTENDANCE</Text></View><Badge value={data.eligibility?.eligible ? 'met' : data.eligibility?.needsReview ? 'review' : 'attention'} /></View><Text style={[styles.body, { marginTop: 10 }]}>{data.eligibility?.attendance.credited ?? 0} credited of {data.eligibility?.attendance.required ?? 0} required; {data.eligibility?.attendance.scheduled ?? 0} scheduled this quarter.</Text></View>
      <View style={styles.eligibilityList}>
        {(data.eligibility?.checks ?? []).map((check) => <View key={check.key} style={styles.eligibilityRow}><View style={styles.eligibilityRowMain}><Text style={styles.actionTitle}>{check.label}</Text><Text style={styles.actionBody}>Current policy requirement</Text></View><Badge value={check.status} /></View>)}
      </View>
      {(data.eligibility?.reasons ?? []).length ? <View style={styles.eligibilityAttention}><Text style={styles.sectionTitle}>Needs attention</Text>{data.eligibility?.reasons.map((reason) => <View key={reason} style={styles.eligibilityReasonRow}><Ionicons name="alert-circle-outline" size={18} color={color.maroon} /><Text style={[styles.body, styles.eligibilityReason]}>{reason}</Text></View>)}</View> : null}
    </> : <Empty title="No evaluation" body="Eligibility will appear once policy data is available." />}
    <Text style={styles.sectionTitle}>Next</Text>
    <EligibilityLink icon="calendar-outline" title="Attendance plan" body="Record conflicts and your attendance commitment." onPress={() => navigation.navigate('ScholarshipAttendancePlan')} />
    <EligibilityLink icon="shield-checkmark-outline" title="Excuse requests" body="Submit or review a documented absence." onPress={() => navigation.navigate('ScholarshipAbsences')} />
    <EligibilityLink icon="podium-outline" title="Performance reviews" body="See six-month evaluation outcomes." onPress={() => navigation.navigate('ScholarshipPerformance')} />
  </Page>
}

function EligibilityLink({ icon, title, body, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string; onPress: () => void }) {
  return <TouchableOpacity style={styles.eligibilityRow} activeOpacity={.72} onPress={onPress}>
    <Ionicons name={icon} size={21} color={color.maroon} />
    <View style={styles.eligibilityRowMain}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionBody}>{body}</Text></View>
    <Ionicons name="chevron-forward" size={17} color={color.dim} />
  </TouchableOpacity>
}

export function ScholarshipAwardsScreen({ navigation }: { navigation: Nav }) {
  const history = useQuery({ queryKey: ['member-scholarship-history'], queryFn: getScholarshipHistory, retry: false })
  const awards = history.data?.scholarships ?? []
  return <Page refreshing={history.isRefetching} onRefresh={() => void history.refetch()} header={<Header title="Awards & payments" navigation={navigation} />}>
    <ActionLink icon="wallet-outline" title="Stipend releases" body="View scheduled, held and received payments." onPress={() => navigation.navigate('Earnings', { view: 'stipends', focusNonce: Date.now() })} />
    <Text style={styles.sectionTitle}>Award history</Text>
    {history.isLoading ? <Loading /> : awards.length ? awards.map((raw, index) => { const item = raw as { _id?: string; awardType?: string; status?: string; startDate?: string; endDate?: string }; return <View key={item._id ?? String(index)} style={styles.card}><View style={styles.between}><Text style={[styles.actionTitle, { flex: 1 }]}>{item.awardType ?? 'GYOCC Member Scholarship'}</Text><Badge value={item.status ?? 'review'} /></View><Text style={[styles.body, { marginTop: 10 }]}>{dateLabel(item.startDate)} — {item.endDate ? dateLabel(item.endDate) : 'Present'}</Text></View> }) : <Empty title="No awards yet" body="Approved scholarship awards will appear here." />}
  </Page>
}
