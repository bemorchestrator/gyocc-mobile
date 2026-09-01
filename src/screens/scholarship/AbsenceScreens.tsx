import React, { useState } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import type { ActivityType, PortalActivity } from '../../api/memberPortal'
import { getActivities, getMemberDocuments, getMemberRequests, requestAbsence } from '../../api/memberServices'
import { ActionLink, Badge, Button, color, dateLabel, Empty, Field, Header, Loading, Nav, Page, styles } from './Shared'

export function ScholarshipAbsencesScreen({ navigation }: { navigation: Nav }) {
  const requests = useQuery({ queryKey: ['member-requests'], queryFn: getMemberRequests, retry: false })
  const activities = useQuery({ queryKey: ['absence-activities'], queryFn: async () => {
    const [upcoming, past] = await Promise.all([getActivities({ status: 'upcoming', limit: 30 }), getActivities({ status: 'past', limit: 15 })])
    return [...upcoming.activities, ...past.activities]
  }, retry: false })
  const absenceRequests = requests.data?.requests.filter((item) => item.type === 'absence') ?? []
  return <Page refreshing={requests.isRefetching || activities.isRefetching} onRefresh={() => { void requests.refetch(); void activities.refetch() }} header={<Header title="Excuse requests" navigation={navigation} />}>
    <ActionLink icon="folder-open-outline" title="Evidence documents" body="Upload evidence before starting a request." onPress={() => navigation.navigate('ScholarshipDocuments')} />
    <Text style={styles.sectionTitle}>Choose an activity</Text>
    {activities.isLoading ? <Loading /> : activities.data?.length ? activities.data.map((activity) => <TouchableOpacity key={`${activity.type}-${activity.sourceId || activity.id}`} style={styles.card} onPress={() => navigation.navigate('ScholarshipAbsenceForm', { activity })}><View style={styles.between}><View style={{ flex: 1 }}><Text style={styles.actionTitle}>{activity.title}</Text><Text style={styles.actionBody}>{dateLabel(activity.date)} · {activity.type.toUpperCase()}</Text></View>{activity.attendanceMode === 'full' ? <Badge value="full attendance" /> : null}</View></TouchableOpacity>) : <Empty title="No eligible activities" body="Assigned activities will appear here." />}
    <Text style={styles.sectionTitle}>Request history</Text>
    {absenceRequests.length ? absenceRequests.map((request) => <View key={request._id} style={styles.card}><View style={styles.between}><Text style={[styles.actionTitle, { flex: 1 }]}>{request.subject}</Text><Badge value={request.status} /></View><Text style={[styles.body, { marginTop: 8 }]}>{dateLabel(request.createdAt)}</Text>{request.response ? <Text style={[styles.body, { marginTop: 6 }]}>{request.response}</Text> : null}</View>) : <Empty title="No requests" body="Submitted excuse requests and decisions will appear here." />}
  </Page>
}

type Route = { params?: { activity?: PortalActivity } }
const categories = ['school', 'work', 'transportation', 'medical', 'family', 'emergency', 'other'] as const
const signerTypes = ['self', 'parent_guardian', 'responsible_adult'] as const

export function ScholarshipAbsenceFormScreen({ navigation, route }: { navigation: Nav; route: Route }) {
  const client = useQueryClient(); const activity = route.params?.activity
  const docs = useQuery({ queryKey: ['member-documents'], queryFn: getMemberDocuments, retry: false })
  const [reason, setReason] = useState(''); const [category, setCategory] = useState<typeof categories[number]>('school'); const [emergency, setEmergency] = useState(false)
  const [signerType, setSignerType] = useState<typeof signerTypes[number]>('self'); const [signerName, setSignerName] = useState(''); const [signerContact, setSignerContact] = useState(''); const [relationship, setRelationship] = useState(''); const [selected, setSelected] = useState<string[]>([])
  const submit = useMutation({ mutationFn: () => {
    if (!activity) throw new Error('Activity is unavailable')
    return requestAbsence({ activityType: activity.type as ActivityType, activityId: activity.sourceId || activity.id, reason, category, isEmergency: emergency, signerType, signerName, signerContact, signerRelationship: relationship, documentIds: selected })
  }, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['member-requests'] }); Toast.show({ type: 'success', text1: 'Excuse request submitted' }); navigation.navigate('ScholarshipAbsences') }, onError: (error: { message?: string }) => Toast.show({ type: 'error', text1: 'Could not submit', text2: error.message }) })
  if (!activity) return <Page header={<Header title="Excuse request" navigation={navigation} />}><Empty title="Activity unavailable" body="Return and choose an assigned activity." /></Page>
  return <Page header={<Header title="Excuse request" subtitle={`${activity.title} · ${dateLabel(activity.date)}`.toUpperCase()} navigation={navigation} />}>
    {activity.attendanceMode === 'full' ? <View style={styles.card}><Text style={styles.actionTitle}>Full-attendance activity</Text><Text style={styles.actionBody}>Only an extreme emergency can be reviewed for this activity.</Text></View> : null}
    <Field label="REASON" value={reason} onChangeText={setReason} placeholder="Explain why you cannot attend." multiline />
    <Text style={styles.label}>CATEGORY</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 15 }}>{categories.map((item) => <TouchableOpacity key={item} style={[styles.badge, category === item && { backgroundColor: '#F1DDE1' }]} onPress={() => { setCategory(item); if (item === 'emergency') setEmergency(true) }}><Text style={{ color: color.maroon, fontSize: 9 }}>{item.replace('_', ' ').toUpperCase()}</Text></TouchableOpacity>)}</View>
    <TouchableOpacity style={[styles.card, styles.between]} onPress={() => setEmergency((value) => !value)}><Text style={styles.actionTitle}>Extreme emergency</Text><Text style={{ color: emergency ? color.green : color.dim, fontSize: 21 }}>{emergency ? '✓' : '○'}</Text></TouchableOpacity>
    <Text style={styles.label}>SIGNER</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 15 }}>{signerTypes.map((item) => <TouchableOpacity key={item} style={[styles.badge, signerType === item && { backgroundColor: '#F1DDE1' }]} onPress={() => setSignerType(item)}><Text style={{ color: color.maroon, fontSize: 9 }}>{item.replaceAll('_', ' ').toUpperCase()}</Text></TouchableOpacity>)}</View>
    <Field label="SIGNER NAME" value={signerName} onChangeText={setSignerName} placeholder="Full legal name" />
    {signerType === 'responsible_adult' ? <><Field label="CONTACT" value={signerContact} onChangeText={setSignerContact} /><Field label="RELATIONSHIP" value={relationship} onChangeText={setRelationship} /></> : null}
    <Text style={styles.sectionTitle}>Evidence</Text>{(docs.data?.documents ?? []).map((document) => { const chosen = selected.includes(document._id); return <TouchableOpacity key={document._id} style={[styles.card, styles.between]} onPress={() => setSelected((items) => chosen ? items.filter((id) => id !== document._id) : [...items, document._id])}><Text style={[styles.actionTitle, { flex: 1 }]}>{document.originalName}</Text><Text style={{ color: chosen ? color.green : color.dim, fontSize: 20 }}>{chosen ? '✓' : '○'}</Text></TouchableOpacity> })}
    <Button label={submit.isPending ? 'SUBMITTING…' : 'SUBMIT FOR REVIEW'} disabled={submit.isPending || !reason.trim() || !signerName.trim()} onPress={() => submit.mutate()} />
  </Page>
}
