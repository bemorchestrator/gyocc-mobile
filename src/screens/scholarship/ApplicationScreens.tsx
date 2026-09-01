import React, { useState } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { deleteMemberDocument, getMemberDocuments, getScholarship, getScholarshipApplications, submitScholarshipApplication, uploadMemberDocument } from '../../api/memberServices'
import { ActionLink, Badge, Button, color, dateLabel, Empty, Field, Header, Loading, Nav, Page, styles } from './Shared'

export function ScholarshipApplicationScreen({ navigation }: { navigation: Nav }) {
  const client = useQueryClient()
  const summary = useQuery({ queryKey: ['member-scholarship'], queryFn: getScholarship, retry: false })
  const applications = useQuery({ queryKey: ['scholarship-applications'], queryFn: getScholarshipApplications, retry: false })
  const documents = useQuery({ queryKey: ['member-documents'], queryFn: getMemberDocuments, retry: false })
  const [statement, setStatement] = useState('')
  const [financialNeed, setFinancialNeed] = useState(true)
  const [selected, setSelected] = useState<string[]>([])
  const latest = applications.data?.applications[0] ?? summary.data?.application
  const open = latest && ['draft', 'submitted', 'under_review', 'waitlisted'].includes(latest.status)
  const type = summary.data?.status === 'active' ? 'renewal' : 'initial'
  const submit = useMutation({
    mutationFn: () => submitScholarshipApplication({ type, financiallyChallenged: financialNeed, financialNeedStatement: statement.trim(), documentIds: selected }),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['scholarship-applications'] }), client.invalidateQueries({ queryKey: ['member-scholarship'] })]); Toast.show({ type: 'success', text1: 'Application submitted' }) },
    onError: (error: { message?: string }) => Toast.show({ type: 'error', text1: 'Could not submit', text2: error.message }),
  })
  return <Page header={<Header title="Application" subtitle={type === 'renewal' ? 'SCHOLARSHIP RENEWAL' : 'INITIAL SCHOLARSHIP'} navigation={navigation} />}>
    {applications.isLoading ? <Loading /> : latest ? <View style={styles.card}><View style={styles.between}><Text style={styles.actionTitle}>{latest.type === 'renewal' ? 'Renewal application' : 'Scholarship application'}</Text><Badge value={latest.status} /></View><Text style={[styles.body, { marginTop: 10 }]}>Submitted {dateLabel(latest.submittedAt ?? latest.createdAt)}</Text>{latest.decisionReason ? <Text style={[styles.body, { marginTop: 7 }]}>{latest.decisionReason}</Text> : null}</View> : null}
    {!open ? <>
      <TouchableOpacity style={[styles.card, styles.between]} onPress={() => setFinancialNeed((value) => !value)}><View style={{ flex: 1 }}><Text style={styles.actionTitle}>Financial need priority</Text><Text style={styles.actionBody}>Confirm if financial circumstances should be considered.</Text></View><Text style={{ color: financialNeed ? color.green : color.dim, fontSize: 22 }}>{financialNeed ? '✓' : '○'}</Text></TouchableOpacity>
      <Field label="FINANCIAL NEED STATEMENT" value={statement} onChangeText={setStatement} placeholder="Explain your circumstances and how the scholarship will help." multiline />
      <Text style={styles.sectionTitle}>Supporting documents</Text>
      {(documents.data?.documents ?? []).map((document) => { const chosen = selected.includes(document._id); return <TouchableOpacity key={document._id} style={[styles.card, styles.between]} onPress={() => setSelected((items) => chosen ? items.filter((id) => id !== document._id) : [...items, document._id])}><View style={{ flex: 1 }}><Text style={styles.actionTitle}>{document.originalName}</Text><Text style={styles.actionBody}>{document.documentType}</Text></View><Text style={{ color: chosen ? color.green : color.dim, fontSize: 20 }}>{chosen ? '✓' : '○'}</Text></TouchableOpacity> })}
      <Button label={submit.isPending ? 'SUBMITTING…' : `SUBMIT ${type.toUpperCase()}`} disabled={submit.isPending || !statement.trim()} onPress={() => submit.mutate()} />
    </> : <Text style={styles.body}>This application is already in the review workflow. You can manage reusable evidence below.</Text>}
    <ActionLink icon="folder-open-outline" title="Supporting documents" body="Upload or remove files used for applications and excuses." onPress={() => navigation.navigate('ScholarshipDocuments')} />
  </Page>
}

export function ScholarshipDocumentsScreen({ navigation }: { navigation: Nav }) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['member-documents'], queryFn: getMemberDocuments, retry: false })
  const upload = useMutation({ mutationFn: async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false })
    if (result.canceled) return null
    const file = result.assets[0]
    return uploadMemberDocument({ uri: file.uri, name: file.name, mimeType: file.mimeType ?? 'application/octet-stream', documentType: 'scholarship_support' })
  }, onSuccess: async (result) => { if (!result) return; await client.invalidateQueries({ queryKey: ['member-documents'] }); Toast.show({ type: 'success', text1: 'Document uploaded' }) }, onError: (error: { message?: string }) => Toast.show({ type: 'error', text1: 'Upload failed', text2: error.message }) })
  const remove = useMutation({ mutationFn: deleteMemberDocument, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['member-documents'] }); Toast.show({ type: 'success', text1: 'Document removed' }) } })
  return <Page refreshing={query.isRefetching} onRefresh={() => void query.refetch()} header={<Header title="Documents" navigation={navigation} />}>
    <Button label={upload.isPending ? 'UPLOADING…' : 'UPLOAD DOCUMENT'} disabled={upload.isPending} onPress={() => upload.mutate()} />
    <Text style={styles.sectionTitle}>Your files</Text>
    {query.isLoading ? <Loading /> : query.data?.documents.length ? query.data.documents.map((document) => <View key={document._id} style={styles.card}><View style={styles.between}><View style={{ flex: 1 }}><Text style={styles.actionTitle}>{document.originalName}</Text><Text style={styles.actionBody}>{document.documentType} · {document.status}</Text></View><TouchableOpacity accessibilityLabel={`Delete ${document.originalName}`} disabled={remove.isPending} onPress={() => remove.mutate(document._id)}><Text style={{ color: color.maroon, fontWeight: '700' }}>REMOVE</Text></TouchableOpacity></View></View>) : <Empty title="No documents" body="Upload evidence for applications or excused absences." />}
  </Page>
}
