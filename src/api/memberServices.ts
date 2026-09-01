import client, { BASE_URL, COOKIE_KEY } from './client'
import { getSessionValue } from '../utils/sessionStorage'
import type { ActivityType, PortalActivity } from './memberPortal'

export interface ScholarshipRequirement {
  key: string
  label: string
  status: 'met' | 'attention' | 'review'
}

export interface ScholarshipSummary {
  status: 'active' | 'review' | 'suspended' | 'expired' | 'ended'
  awardType: string
  startDate?: string | null
  endDate?: string | null
  renewalDate?: string | null
  attendanceRequirement: number
  currentAttendanceRate: number
  requirements: ScholarshipRequirement[]
  remarks?: string
  application?: ScholarshipApplicationDTO | null
  policy?: { version: number; name: string; minimumAttendancePercent: number }
  eligibility?: ScholarshipEligibilityDTO
  availableActions?: string[]
}

export interface ScholarshipAttendanceMetrics {
  scheduled: number
  required: number
  attended: number
  excused: number
  pending: number
  unexcused: number
  lateEquivalentAbsences: number
  credited: number
  percentage: number
}

export interface ScholarshipEligibilityDTO {
  eligible: boolean
  needsReview: boolean
  policyVersion: number
  periodStart: string
  periodEnd: string
  reasons: string[]
  checks: ScholarshipRequirement[]
  attendance: ScholarshipAttendanceMetrics
  performanceEvaluationId?: string | null
}

export interface ScholarshipApplicationDTO {
  _id: string
  type: 'initial' | 'renewal'
  status: 'draft' | 'submitted' | 'under_review' | 'waitlisted' | 'approved' | 'rejected' | 'withdrawn'
  policyVersion: number
  requestedPeriodStart: string
  requestedPeriodEnd: string
  financiallyChallenged: boolean
  financialNeedStatement: string
  documentIds: string[]
  submittedAt?: string | null
  reviewedAt?: string | null
  decisionReason?: string
  approvedMonthlyAmount?: number | null
  createdAt: string
}

export interface PerformanceEvaluationDTO {
  _id: string
  periodStart: string
  periodEnd: string
  overallScore?: number | null
  outcome: 'passed' | 'improvement_plan' | 'observation' | 'probation'
  recommendations: string
  evaluatedAt: string
  nextDueDate: string
}

export interface AttendancePlanDTO {
  _id: string
  periodStart: string
  periodEnd: string
  knownConflicts: string
  travelLimitations: string
  communicationPlan: string
  attendanceCommitment: string
  status: 'submitted' | 'approved' | 'changes_requested' | 'expired'
  reviewerNote?: string
  createdAt: string
}

export interface EquipmentLoanDTO {
  _id: string
  equipmentName: string
  qtyBorrowed: number
  dateBorrowed: string
  expectedReturnDate?: string | null
  actualReturnDate?: string | null
  conditionOnLoan: string
  conditionOnReturn?: string | null
  purpose: string
  venue: string
}

export interface MemberDocumentDTO {
  _id: string
  documentType: string
  originalName: string
  url: string
  mimeType: string
  size: number
  status: 'submitted' | 'approved' | 'rejected'
  reviewerNote?: string
  createdAt: string
}

export interface AnnouncementDTO {
  _id: string
  title: string
  body: string
  audience: string
  priority: 'normal' | 'important' | 'urgent'
  publishedAt: string
}

export interface MemberRequestDTO {
  _id: string
  type: 'attendance_correction' | 'absence' | 'scholarship_renewal' | 'equipment_issue' | 'performance_question' | 'leave'
  status: 'pending' | 'approved' | 'rejected' | 'resolved' | 'cancelled'
  subject: string
  message: string
  response?: string
  startsAt?: string | null
  endsAt?: string | null
  createdAt: string
}

export interface FullyAttendedMember {
  memberId: string
  name: string
  avatarUrl: string | null
}

export interface AttendanceHistoryRecord {
  _id: string
  sourceType: string
  scheduledStartAt: string
  status: string
}

export async function getActivities(params?: { type?: ActivityType; status?: 'upcoming' | 'past'; year?: number; page?: number; limit?: number }) {
  const { data } = await client.get('/api/member-portal/activities', { params })
  return data as { activities: PortalActivity[]; total: number; page: number; pages: number }
}

export async function getActivity(type: ActivityType, id: string) {
  const { data } = await client.get(`/api/member-portal/activities/${type}/${encodeURIComponent(id)}`)
  return data as { activity: PortalActivity & { instructions?: string; mapUrl?: string } }
}

export async function getFullyAttendedMembers(type: ActivityType, id: string) {
  const { data } = await client.get(`/api/member-portal/activities/${type}/${encodeURIComponent(id)}/fully-attended`)
  return data as { total: number; attendees: FullyAttendedMember[] }
}

export async function getAttendance(params?: { year?: number; type?: ActivityType }) {
  const { data } = await client.get('/api/member-portal/attendance', { params })
  const records: Record<string, unknown>[] = Array.isArray(data?.records)
    ? data.records.filter((item: unknown): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : []

  return {
    records: records.map((raw: Record<string, unknown>): AttendanceHistoryRecord => ({
      _id: String(raw._id ?? raw.id ?? ''),
      // The attendance collection uses `activityType`; older portal payloads use
      // `sourceType`. Normalize both contracts before they reach the UI.
      sourceType: String(raw.sourceType ?? raw.activityType ?? 'activity'),
      scheduledStartAt: String(raw.scheduledStartAt ?? raw.date ?? ''),
      status: String(raw.status ?? raw.attendanceStatus ?? 'Pending'),
    })),
  }
}

export async function requestAttendanceCorrection(recordId: string, message: string) {
  const { data } = await client.post(`/api/member-portal/attendance/${encodeURIComponent(recordId)}/correction-request`, { message })
  return data as { request: MemberRequestDTO }
}

export async function requestAbsence(input: { activityType: ActivityType; activityId: string; reason: string; category: 'school' | 'work' | 'transportation' | 'medical' | 'family' | 'emergency' | 'other'; isEmergency: boolean; signerType: 'self' | 'parent_guardian' | 'responsible_adult'; signerName: string; signerContact?: string; signerRelationship?: string; documentIds: string[] }) {
  const { data } = await client.post('/api/member-portal/absence-request', input)
  return data as { request: MemberRequestDTO }
}

export async function getEquipmentLoans() {
  const { data } = await client.get('/api/member-portal/equipment-loans')
  return data as { loans: EquipmentLoanDTO[] }
}

export async function getEquipmentLoan(id: string) {
  const { data } = await client.get(`/api/member-portal/equipment-loans/${encodeURIComponent(id)}`)
  return data as { loan: EquipmentLoanDTO }
}

export async function reportEquipmentIssue(id: string, message: string) {
  const { data } = await client.post(`/api/member-portal/equipment-loans/${encodeURIComponent(id)}/report-issue`, { message })
  return data as { request: MemberRequestDTO }
}

export async function getScholarship() {
  const { data } = await client.get('/api/member-portal/scholarships/me')
  return data as ScholarshipSummary
}

export async function getScholarshipHistory() {
  const { data } = await client.get('/api/member-portal/scholarships/me/history')
  return data as { scholarships: Array<Record<string, unknown>> }
}

export async function getScholarshipApplications() {
  const { data } = await client.get('/api/member-portal/scholarships/me/applications')
  return data as { applications: ScholarshipApplicationDTO[] }
}

export async function submitScholarshipApplication(input: { type: 'initial' | 'renewal'; financiallyChallenged: boolean; financialNeedStatement: string; documentIds: string[] }) {
  const { data } = await client.post('/api/member-portal/scholarships/me/applications', input)
  return data as { application: ScholarshipApplicationDTO; eligibility: ScholarshipEligibilityDTO }
}

export async function getScholarshipEvaluations() {
  const { data } = await client.get('/api/member-portal/scholarships/me/evaluations')
  return data as { evaluations: PerformanceEvaluationDTO[] }
}

export async function getAttendancePlans() {
  const { data } = await client.get('/api/member-portal/attendance-plans/me')
  return data as { plans: AttendancePlanDTO[] }
}

export async function submitAttendancePlan(input: { knownConflicts: string; travelLimitations: string; communicationPlan: string; attendanceCommitment: string }) {
  const { data } = await client.post('/api/member-portal/attendance-plans/me', input)
  return data as { plan: AttendancePlanDTO }
}

export async function requestScholarshipRenewal(message?: string) {
  const { data } = await client.post('/api/member-portal/scholarships/me/renewal', { message })
  return data as { application: ScholarshipApplicationDTO; eligibility: ScholarshipEligibilityDTO }
}

export async function getMemberDocuments() {
  const { data } = await client.get('/api/member-portal/documents')
  return data as { documents: MemberDocumentDTO[] }
}

export async function uploadMemberDocument(input: { uri: string; name: string; mimeType: string; documentType: string }) {
  const form = new FormData()
  form.append('documentType', input.documentType)
  form.append('file', { uri: input.uri, name: input.name, type: input.mimeType } as never)
  const cookie = await getSessionValue(COOKIE_KEY)
  const response = await fetch(`${BASE_URL}/api/member-portal/documents`, {
    method: 'POST',
    headers: { ...(cookie ? { Cookie: cookie, 'X-GYOCC-Session-Cookie': cookie } : {}) },
    body: form,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Document upload failed')
  return data as { document: MemberDocumentDTO }
}

export async function deleteMemberDocument(id: string) {
  await client.delete(`/api/member-portal/documents/${encodeURIComponent(id)}`)
}

export async function getAnnouncements() {
  const { data } = await client.get('/api/member-portal/announcements')
  return data as { announcements: AnnouncementDTO[] }
}

export async function askPerformanceQuestion(type: ActivityType, id: string, message: string) {
  const { data } = await client.post(`/api/member-portal/performances/${type}/${encodeURIComponent(id)}/question`, { message })
  return data as { request: MemberRequestDTO }
}

export async function submitLeaveRequest(startsAt: string, endsAt: string, reason: string) {
  const { data } = await client.post('/api/member-portal/leave-request', { startsAt, endsAt, reason })
  return data as { request: MemberRequestDTO }
}

export async function getMemberRequests() {
  const { data } = await client.get('/api/member-portal/requests')
  return data as { requests: MemberRequestDTO[] }
}

export async function getCalendarFile() {
  const { data } = await client.get('/api/member-portal/calendar.ics', { responseType: 'text' })
  return String(data)
}

export async function getStipendStatement(year: number, format?: 'csv') {
  const { data } = await client.get('/api/member-portal/stipends/statement', { params: { year, format }, responseType: format === 'csv' ? 'text' : 'json' })
  return data
}

export async function getStipendReceipt(id: string) {
  const { data } = await client.get(`/api/member-portal/stipends/disbursements/${encodeURIComponent(id)}/receipt`)
  return data as { receipt: Record<string, string | number | null> }
}
