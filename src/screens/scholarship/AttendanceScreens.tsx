import React, { useState } from 'react'
import { Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { getAttendancePlans, getScholarshipEvaluations, submitAttendancePlan } from '../../api/memberServices'
import { Badge, Button, dateLabel, Empty, Field, Header, Loading, Nav, Page, styles } from './Shared'

export function ScholarshipAttendancePlanScreen({ navigation }: { navigation: Nav }) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['attendance-plans'], queryFn: getAttendancePlans, retry: false })
  const [knownConflicts, setKnownConflicts] = useState('')
  const [travelLimitations, setTravelLimitations] = useState('')
  const [communicationPlan, setCommunicationPlan] = useState('')
  const [attendanceCommitment, setAttendanceCommitment] = useState('')
  const current = query.data?.plans.find((plan) => ['submitted', 'approved'].includes(plan.status))
  const submit = useMutation({ mutationFn: () => submitAttendancePlan({ knownConflicts, travelLimitations, communicationPlan, attendanceCommitment }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['attendance-plans'] }); Toast.show({ type: 'success', text1: 'Attendance plan submitted' }) }, onError: (error: { message?: string }) => Toast.show({ type: 'error', text1: 'Could not submit plan', text2: error.message }) })
  return <Page header={<Header title="Attendance plan" subtitle="ONE PLAN PER QUARTER" navigation={navigation} />}>
    {query.isLoading ? <Loading /> : current ? <View style={styles.card}><View style={styles.between}><Text style={styles.actionTitle}>{dateLabel(current.periodStart)} — {dateLabel(current.periodEnd)}</Text><Badge value={current.status} /></View><Text style={[styles.body, { marginTop: 10 }]}>{current.attendanceCommitment}</Text>{current.reviewerNote ? <Text style={[styles.body, { marginTop: 7 }]}>Reviewer: {current.reviewerNote}</Text> : null}</View> : <>
      <Field label="KNOWN CONFLICTS" value={knownConflicts} onChangeText={setKnownConflicts} placeholder="School, work or family dates" multiline />
      <Field label="TRAVEL LIMITATIONS" value={travelLimitations} onChangeText={setTravelLimitations} placeholder="Transport and travel constraints" multiline />
      <Field label="COMMUNICATION PLAN" value={communicationPlan} onChangeText={setCommunicationPlan} placeholder="How and when you will notify coordinators" multiline />
      <Field label="ATTENDANCE COMMITMENT" value={attendanceCommitment} onChangeText={setAttendanceCommitment} placeholder="Your plan to meet required attendance" multiline />
      <Button label={submit.isPending ? 'SUBMITTING…' : 'SUBMIT QUARTER PLAN'} disabled={submit.isPending || !attendanceCommitment.trim() || !communicationPlan.trim()} onPress={() => submit.mutate()} />
    </>}
    {query.data?.plans.filter((plan) => plan._id !== current?._id).length ? <><Text style={styles.sectionTitle}>Previous plans</Text>{query.data.plans.filter((plan) => plan._id !== current?._id).map((plan) => <View key={plan._id} style={styles.card}><View style={styles.between}><Text style={styles.actionTitle}>{dateLabel(plan.periodStart)}</Text><Badge value={plan.status} /></View></View>)}</> : null}
  </Page>
}

export function ScholarshipPerformanceScreen({ navigation }: { navigation: Nav }) {
  const query = useQuery({ queryKey: ['scholarship-evaluations'], queryFn: getScholarshipEvaluations, retry: false })
  return <Page refreshing={query.isRefetching} onRefresh={() => void query.refetch()} header={<Header title="Performance reviews" subtitle="SIX-MONTH EVALUATION RECORD" navigation={navigation} />}>
    {query.isLoading ? <Loading /> : query.data?.evaluations.length ? query.data.evaluations.map((evaluation) => <View key={evaluation._id} style={styles.card}><View style={styles.between}><View><Text style={styles.metric}>{evaluation.overallScore == null ? '—' : Math.round(evaluation.overallScore)}</Text><Text style={styles.metricLabel}>OVERALL SCORE</Text></View><Badge value={evaluation.outcome} /></View><Text style={[styles.body, { marginTop: 12 }]}>{dateLabel(evaluation.periodStart)} — {dateLabel(evaluation.periodEnd)}</Text>{evaluation.recommendations ? <Text style={[styles.body, { marginTop: 8 }]}>{evaluation.recommendations}</Text> : null}<Text style={[styles.metricLabel, { marginTop: 10 }]}>NEXT DUE {dateLabel(evaluation.nextDueDate).toUpperCase()}</Text></View>) : <Empty title="No evaluations yet" body="Your completed performance reviews will appear here." />}
  </Page>
}
