import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, Switch, Modal, FlatList, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getGig, listParticipants, updateParticipant, removeParticipant,
  addParticipant, getGigFinance, createExpense, deleteExpense,
  listGigEquipment, setGigStatus, listMembers,
} from "../api/gigs";
import LoadingSpinner from "../components/LoadingSpinner";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Gig, GigParticipant, GigFinance, GigExpense, GigLoan } from "../types";
import { font } from '../constants/fonts';

const TEAL = "#0D9488";

type Tab = "details" | "team" | "finance" | "gear";

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  Inquiry:   { bg: "rgba(255,255,255,0.2)", text: "#fff" },
  Confirmed: { bg: "rgba(255,255,255,0.2)", text: "#fff" },
  Completed: { bg: "rgba(255,255,255,0.2)", text: "#fff" },
  Cancelled: { bg: "rgba(239,68,68,0.3)",   text: "#fff" },
};

const CONFIRM_COLOR: Record<string, { bg: string; text: string }> = {
  Pending:   { bg: "#FEF3C7", text: "#D97706" },
  Confirmed: { bg: "#DCFCE7", text: "#16A34A" },
  Declined:  { bg: "#FEE2E2", text: "#DC2626" },
};

const EXPENSE_CATEGORIES = ["Transportation","Food","Equipment","Venue","Admin","Uniform","Misc"];
const NEXT_STATUS: Record<string, string | null> = {
  Inquiry: "Confirmed", Confirmed: "Completed", Completed: null, Cancelled: null,
};

type Props = NativeStackScreenProps<any>;

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-PH", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric",
  });
}
function peso(n: number) {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 0 });
}

export default function GigDetailScreen({ route, navigation }: Props) {
  const { id } = route.params as { id: string };
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("details");

  // Finance form
  const [expDesc, setExpDesc]       = useState("");
  const [expAmount, setExpAmount]   = useState("");
  const [expCat, setExpCat]         = useState("Misc");
  const [expDate, setExpDate]       = useState(new Date().toISOString().slice(0, 10));
  const [expSaving, setExpSaving]   = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);

  // Add participant modal
  const [addOpen, setAddOpen] = useState(false);

  const { data: gig, isLoading } = useQuery({
    queryKey: ["gig", id],
    queryFn: () => getGig(id),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["gig-participants", id],
    queryFn: () => listParticipants(id),
    enabled: tab === "team",
  });

  const { data: finance } = useQuery<GigFinance>({
    queryKey: ["gig-finance", id],
    queryFn: () => getGigFinance(id),
    enabled: tab === "finance",
  });

  const { data: gearLoans = [] } = useQuery({
    queryKey: ["gig-equipment", id],
    queryFn: () => listGigEquipment(id),
    enabled: tab === "gear",
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => setGigStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig", id] });
      queryClient.invalidateQueries({ queryKey: ["gigs"] });
      Toast.show({ type: "success", text1: "Status updated" });
    },
    onError: () => Toast.show({ type: "error", text1: "Failed to update status" }),
  });

  const participantMutation = useMutation({
    mutationFn: ({ pid, data }: { pid: string; data: Record<string, unknown> }) =>
      updateParticipant(id, pid, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gig-participants", id] }),
  });

  const removeParticipantMutation = useMutation({
    mutationFn: (pid: string) => removeParticipant(id, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig-participants", id] });
      Toast.show({ type: "success", text1: "Participant removed" });
    },
  });

  const expenseMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createExpense(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig-finance", id] });
      setExpDesc(""); setExpAmount(""); setExpCat("Misc");
      setExpDate(new Date().toISOString().slice(0, 10));
      setShowExpForm(false);
      Toast.show({ type: "success", text1: "Expense added" });
    },
    onError: () => Toast.show({ type: "error", text1: "Failed to add expense" }),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (eid: string) => deleteExpense(eid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig-finance", id] });
      Toast.show({ type: "success", text1: "Expense deleted" });
    },
  });

  function confirmStatusChange(status: string) {
    Alert.alert("Update Status", `Change status to "${status}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: () => statusMutation.mutate(status) },
    ]);
  }

  function confirmRemoveParticipant(p: GigParticipant) {
    Alert.alert("Remove Participant", `Remove ${p.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeParticipantMutation.mutate(p._id) },
    ]);
  }

  async function handleSaveExpense() {
    if (!expDesc.trim() || !expAmount || Number(expAmount) <= 0) {
      Toast.show({ type: "error", text1: "Description and amount required" });
      return;
    }
    expenseMutation.mutate({
      description: expDesc.trim(),
      amount: Number(expAmount),
      category: expCat,
      date: expDate,
      gigId: id,
    });
  }

  if (isLoading || !gig) return <LoadingSpinner />;

  const gigData = gig as Gig;
  const badge = STATUS_COLOR[gigData.status] ?? STATUS_COLOR.Inquiry;
  const nextStatus = NEXT_STATUS[gigData.status];
  const TABS: { key: Tab; label: string }[] = [
    { key: "details",  label: "Details" },
    { key: "team",     label: "Team" },
    { key: "finance",  label: "Finance" },
    { key: "gear",     label: "Gear" },
  ];

  return (
    <View style={styles.root}>
      {/* ── Hero ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />

        <View style={styles.heroTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate("AddEditGig", { id: gigData._id, gig: gigData })}
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={[styles.typePill, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Text style={styles.typePillText}>{gigData.type}</Text>
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>{gigData.title}</Text>
        {gigData.client?.name && (
          <Text style={styles.heroClient}>{gigData.client.name}</Text>
        )}

        <View style={styles.heroBadgeRow}>
          <View style={[styles.heroBadge, { backgroundColor: badge.bg }]}>
            <Text style={styles.heroBadgeText}>{gigData.status}</Text>
          </View>
          <View style={[styles.heroBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Ionicons name="calendar-outline" size={12} color="#fff" />
            <Text style={styles.heroBadgeText}>{fmt(gigData.startDate)}</Text>
          </View>
          {gigData.contractedFee > 0 && (
            <View style={[styles.heroBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Ionicons name="cash-outline" size={12} color="#fff" />
              <Text style={styles.heroBadgeText}>{peso(gigData.contractedFee)}</Text>
            </View>
          )}
        </View>

        {/* Status action buttons */}
        {(nextStatus || (gigData.status !== "Cancelled" && gigData.status !== "Completed")) && (
          <View style={styles.heroActions}>
            {nextStatus && (
              <TouchableOpacity
                style={styles.heroActionBtn}
                onPress={() => confirmStatusChange(nextStatus)}
              >
                <Ionicons name="checkmark-circle-outline" size={15} color={TEAL} />
                <Text style={styles.heroActionText}>
                  {nextStatus === "Confirmed" ? "Confirm Booking" : "Mark Complete"}
                </Text>
              </TouchableOpacity>
            )}
            {gigData.status !== "Cancelled" && gigData.status !== "Completed" && (
              <TouchableOpacity
                style={[styles.heroActionBtn, { backgroundColor: "rgba(239,68,68,0.2)" }]}
                onPress={() => confirmStatusChange("Cancelled")}
              >
                <Ionicons name="close-circle-outline" size={15} color="#FCA5A5" />
                <Text style={[styles.heroActionText, { color: "#FCA5A5" }]}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── White Sheet ── */}
      <View style={styles.sheet}>
        {/* Tab pills */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabPill, tab === t.key && styles.tabPillActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabPillText, tab === t.key && styles.tabPillTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Details Tab ── */}
        {tab === "details" && (
          <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            {gigData.contractedFee > 0 && (
              <View style={styles.feeCard}>
                <Text style={styles.feeLabel}>Contracted Fee</Text>
                <Text style={styles.feeAmount}>{peso(gigData.contractedFee)}</Text>
              </View>
            )}

            <SectionCard title="Date & Time">
              <InfoRow icon="calendar-outline" label="Start" value={fmt(gigData.startDate)} />
              {gigData.endDate !== gigData.startDate && (
                <InfoRow icon="calendar-outline" label="End" value={fmt(gigData.endDate)} />
              )}
            </SectionCard>

            {(gigData.client?.name || gigData.client?.email || gigData.client?.phone) && (
              <SectionCard title="Client">
                {gigData.client?.name    && <InfoRow icon="person-outline"    label="Name"    value={gigData.client.name} />}
                {gigData.client?.contact && <InfoRow icon="call-outline"      label="Contact" value={gigData.client.contact} />}
                {gigData.client?.email   && <InfoRow icon="mail-outline"      label="Email"   value={gigData.client.email} />}
                {gigData.client?.phone   && <InfoRow icon="phone-portrait-outline" label="Phone" value={gigData.client.phone} />}
              </SectionCard>
            )}

            {(gigData.venue?.name || gigData.venue?.address) && (
              <SectionCard title="Venue">
                {gigData.venue?.name    && <InfoRow icon="location-outline" label="Name"    value={gigData.venue.name} />}
                {gigData.venue?.address && <InfoRow icon="map-outline"      label="Address" value={gigData.venue.address} />}
                {gigData.venue?.mapUrl  && (
                  <TouchableOpacity
                    style={styles.linkRow}
                    onPress={() => gigData.venue?.mapUrl && Linking.openURL(gigData.venue.mapUrl)}
                  >
                    <Ionicons name="navigate-outline" size={14} color={TEAL} />
                    <Text style={styles.linkText}>Open in Maps</Text>
                    <Ionicons name="open-outline" size={12} color={TEAL} />
                  </TouchableOpacity>
                )}
              </SectionCard>
            )}

            {gigData.virtualLink && (
              <SectionCard title="Virtual Link">
                <TouchableOpacity
                  style={styles.linkRow}
                  onPress={() => gigData.virtualLink && Linking.openURL(gigData.virtualLink)}
                >
                  <Ionicons name="videocam-outline" size={14} color={TEAL} />
                  <Text style={styles.linkText} numberOfLines={1}>{gigData.virtualLink}</Text>
                  <Ionicons name="open-outline" size={12} color={TEAL} />
                </TouchableOpacity>
              </SectionCard>
            )}

            {gigData.program && gigData.program.filter(p => p.title).length > 0 && (
              <SectionCard title="Program">
                {gigData.program.filter(p => p.title).map((item, i) => (
                  <View key={i} style={styles.programRow}>
                    {item.time && (
                      <Text style={styles.programTime}>{item.time}</Text>
                    )}
                    <Text style={styles.programTitle}>{item.title}</Text>
                  </View>
                ))}
              </SectionCard>
            )}

            {gigData.notes && (
              <SectionCard title="Notes">
                <Text style={styles.notesText}>{gigData.notes}</Text>
              </SectionCard>
            )}
          </ScrollView>
        )}

        {/* ── Team Tab ── */}
        {tab === "team" && (
          <View style={styles.tabFlex}>
            <View style={styles.teamHeader}>
              <Text style={styles.teamCount}>
                {(participants as GigParticipant[]).length} participant{(participants as GigParticipant[]).length !== 1 ? "s" : ""}
              </Text>
              <TouchableOpacity style={styles.addTeamBtn} onPress={() => setAddOpen(true)}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addTeamText}>Add</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={participants as GigParticipant[]}
              keyExtractor={(p) => p._id}
              contentContainerStyle={styles.tabContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyTeam}>
                  <Ionicons name="people-outline" size={40} color="#CBD5E1" />
                  <Text style={styles.emptyText}>No participants yet</Text>
                </View>
              }
              renderItem={({ item: p }) => {
                const conf = CONFIRM_COLOR[p.confirmation] ?? CONFIRM_COLOR.Pending;
                return (
                  <View style={styles.participantCard}>
                    <View style={styles.participantAvatar}>
                      <Text style={styles.avatarText}>
                        {p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.participantInfo}>
                      <View style={styles.participantNameRow}>
                        <Text style={styles.participantName}>{p.name}</Text>
                        {p.isExternal && (
                          <View style={styles.externalBadge}>
                            <Text style={styles.externalText}>Ext</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.participantRole}>
                        {[p.role, p.rank, p.level ? `L${p.level}` : null].filter(Boolean).join(" · ")}
                      </Text>
                      {p.payoutAmount > 0 && (
                        <Text style={styles.participantPayout}>{peso(p.payoutAmount)}</Text>
                      )}
                    </View>
                    <View style={styles.participantActions}>
                      <View style={[styles.confBadge, { backgroundColor: conf.bg }]}>
                        <Text style={[styles.confText, { color: conf.text }]}>
                          {p.confirmation}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.attendBtn, p.attended && styles.attendBtnActive]}
                        onPress={() => participantMutation.mutate({ pid: p._id, data: { attended: !p.attended } })}
                      >
                        <Ionicons
                          name={p.attended ? "checkmark-circle" : "ellipse-outline"}
                          size={20}
                          color={p.attended ? TEAL : "#CBD5E1"}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmRemoveParticipant(p)}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        )}

        {/* ── Finance Tab ── */}
        {tab === "finance" && (
          <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            {finance && (
              <>
                {/* 3 stat cards */}
                <View style={styles.financeCards}>
                  <FinanceCard label="Contracted Fee" value={peso(finance.contractedFee)} color="#1E293B" />
                  <FinanceCard label="Total Expenses"  value={peso(finance.totalExpenses)}  color="#EF4444" />
                  <FinanceCard label="Net Income"      value={peso(finance.netIncome)}      color={TEAL} />
                </View>

                {/* Expenses */}
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Expenses</Text>
                  <TouchableOpacity
                    style={styles.addExpBtn}
                    onPress={() => setShowExpForm(!showExpForm)}
                  >
                    <Ionicons name={showExpForm ? "close" : "add"} size={16} color={TEAL} />
                    <Text style={styles.addExpText}>{showExpForm ? "Cancel" : "Add"}</Text>
                  </TouchableOpacity>
                </View>

                {showExpForm && (
                  <View style={styles.expForm}>
                    <TextInput
                      style={styles.expInput}
                      placeholder="Description *"
                      placeholderTextColor="#A0AEC0"
                      value={expDesc}
                      onChangeText={setExpDesc}
                    />
                    <View style={styles.expRow}>
                      <TextInput
                        style={[styles.expInput, { flex: 1 }]}
                        placeholder="Amount (₱) *"
                        placeholderTextColor="#A0AEC0"
                        value={expAmount}
                        onChangeText={setExpAmount}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        style={[styles.expInput, { flex: 1 }]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#A0AEC0"
                        value={expDate}
                        onChangeText={setExpDate}
                      />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                      <View style={styles.catRow}>
                        {EXPENSE_CATEGORIES.map((c) => (
                          <TouchableOpacity
                            key={c}
                            style={[styles.catChip, expCat === c && styles.catChipActive]}
                            onPress={() => setExpCat(c)}
                          >
                            <Text style={[styles.catChipText, expCat === c && styles.catChipTextActive]}>{c}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                    <TouchableOpacity
                      style={[styles.expSaveBtn, expenseMutation.isPending && { opacity: 0.6 }]}
                      onPress={handleSaveExpense}
                      disabled={expenseMutation.isPending}
                    >
                      <Text style={styles.expSaveBtnText}>
                        {expenseMutation.isPending ? "Saving..." : "Add Expense"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {finance.expenses.length === 0 ? (
                  <Text style={styles.emptyExpenses}>No expenses recorded.</Text>
                ) : (
                  finance.expenses.map((e: GigExpense) => (
                    <View key={e._id} style={styles.expenseRow}>
                      <View style={styles.expCatBadge}>
                        <Text style={styles.expCatText}>{e.category}</Text>
                      </View>
                      <View style={styles.expenseInfo}>
                        <Text style={styles.expenseDesc} numberOfLines={1}>{e.description}</Text>
                        <Text style={styles.expenseDate}>
                          {new Date(e.date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                        </Text>
                      </View>
                      <Text style={styles.expenseAmount}>{peso(e.amount)}</Text>
                      <TouchableOpacity
                        onPress={() => Alert.alert("Delete Expense", `Delete "${e.description}"?`, [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: () => deleteExpenseMutation.mutate(e._id) },
                        ])}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                {/* Payout rows */}
                {finance.payoutRows.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Payout Breakdown</Text>
                    <View style={styles.payoutCard}>
                      {finance.payoutRows.map((r, i) => (
                        <View
                          key={r._id}
                          style={[
                            styles.payoutRow,
                            i === finance.payoutRows.length - 1 && { borderBottomWidth: 0 },
                          ]}
                        >
                          <View style={styles.payoutName}>
                            <Text style={styles.payoutNameText}>{r.name}</Text>
                            {r.isExternal && (
                              <View style={styles.externalBadge}>
                                <Text style={styles.externalText}>Ext</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.payoutRank}>
                            {r.rank ? `${r.rank}${r.level ? ` L${r.level}` : ""}` : r.role || "—"}
                          </Text>
                          <Text style={styles.payoutAmount}>
                            {r.payoutAmount > 0 ? peso(r.payoutAmount) : "—"}
                          </Text>
                        </View>
                      ))}
                      <View style={styles.payoutTotal}>
                        <Text style={styles.payoutTotalLabel}>Total Payouts</Text>
                        <Text style={styles.payoutTotalValue}>{peso(finance.totalPayouts)}</Text>
                      </View>
                      <View style={styles.payoutRemaining}>
                        <Text style={styles.payoutRemainingLabel}>Remaining</Text>
                        <Text style={[styles.payoutRemainingValue, finance.remaining < 0 && { color: "#EF4444" }]}>
                          {peso(finance.remaining)}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>
        )}

        {/* ── Gear Tab ── */}
        {tab === "gear" && (
          <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            {(gearLoans as GigLoan[]).length === 0 ? (
              <View style={styles.emptyTeam}>
                <Ionicons name="cube-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>No equipment assigned</Text>
                <Text style={styles.emptySubText}>Assign equipment from the web admin panel</Text>
              </View>
            ) : (
              (gearLoans as GigLoan[]).map((loan) => (
                <View key={loan._id} style={styles.gearCard}>
                  <View style={styles.gearIconBox}>
                    <Ionicons name="cube-outline" size={20} color={TEAL} />
                  </View>
                  <View style={styles.gearInfo}>
                    <Text style={styles.gearName}>{loan.equipmentName}</Text>
                    <Text style={styles.gearMeta}>
                      {loan.qtyBorrowed} unit{loan.qtyBorrowed !== 1 ? "s" : ""} · {loan.borrowerName}
                    </Text>
                    <View style={styles.gearBadgeRow}>
                      <View style={[
                        styles.gearStatusBadge,
                        {
                          backgroundColor:
                            loan.status === "Returned" ? "#DCFCE7" :
                            loan.status === "Overdue"  ? "#FEE2E2" : "#DBEAFE",
                        },
                      ]}>
                        <Text style={[
                          styles.gearStatusText,
                          {
                            color:
                              loan.status === "Returned" ? "#16A34A" :
                              loan.status === "Overdue"  ? "#DC2626" : "#2563EB",
                          },
                        ]}>
                          {loan.status ?? "Active"}
                        </Text>
                      </View>
                      <Text style={styles.gearCondition}>
                        {loan.conditionOnReturn ?? loan.conditionOnLoan}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Add Participant Modal */}
      {addOpen && (
        <AddParticipantModal
          gigId={id}
          existingIds={(participants as GigParticipant[]).map((p) => p.memberId).filter(Boolean) as string[]}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            setAddOpen(false);
            queryClient.invalidateQueries({ queryKey: ["gig-participants", id] });
          }}
        />
      )}
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionCardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={14} color="#94A3B8" style={{ marginTop: 1 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function FinanceCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.financeCard}>
      <Text style={styles.financeCardLabel}>{label}</Text>
      <Text style={[styles.financeCardValue, { color }]}>{value}</Text>
    </View>
  );
}

function AddParticipantModal({ gigId, existingIds, onClose, onAdded }: {
  gigId: string;
  existingIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [tab, setTab] = useState<"member" | "external">("member");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [extName, setExtName] = useState("");
  const [extRole, setExtRole] = useState("Performer");
  const [saving, setSaving] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: listMembers,
  });

  const available = (members as any[]).filter(
    (m) =>
      !existingIds.includes(m._id) &&
      (m.name?.toLowerCase().includes(search.toLowerCase()) ||
       m.email?.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleAdd() {
    setSaving(true);
    try {
      if (tab === "member") {
        const toAdd = (members as any[]).filter((m) => selected.has(m._id));
        await Promise.all(
          toAdd.map((m) =>
            addParticipant(gigId, {
              memberId: m._id, name: m.name, email: m.email,
              rank: m.rank, level: m.level,
              role: "Performer", isExternal: false, payoutMode: "rate", payoutAmount: 0,
            })
          )
        );
      } else {
        if (!extName.trim()) {
          Toast.show({ type: "error", text1: "Name is required" });
          setSaving(false);
          return;
        }
        await addParticipant(gigId, {
          name: extName.trim(), role: extRole, isExternal: true,
          payoutMode: "custom", payoutAmount: 0,
        });
      }
      Toast.show({ type: "success", text1: "Participant(s) added" });
      onAdded();
    } catch {
      Toast.show({ type: "error", text1: "Failed to add participant" });
    }
    setSaving(false);
  }

  return (
    <Modal visible animationType="slide" transparent>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Add Participant</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={modal.tabs}>
            {(["member", "external"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[modal.tabBtn, tab === t && modal.tabBtnActive]}
                onPress={() => { setTab(t); setSelected(new Set()); }}
              >
                <Text style={[modal.tabBtnText, tab === t && modal.tabBtnTextActive]}>
                  {t === "member" ? "Member" : "External"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === "member" ? (
            <>
              <TextInput
                style={modal.search}
                placeholder="Search members..."
                placeholderTextColor="#A0AEC0"
                value={search}
                onChangeText={setSearch}
              />
              <FlatList
                data={available}
                keyExtractor={(m) => m._id}
                style={modal.list}
                ListEmptyComponent={
                  <Text style={modal.empty}>No available members</Text>
                }
                renderItem={({ item: m }) => {
                  const isSelected = selected.has(m._id);
                  return (
                    <TouchableOpacity
                      style={[modal.memberRow, isSelected && modal.memberRowSelected]}
                      onPress={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          next.has(m._id) ? next.delete(m._id) : next.add(m._id);
                          return next;
                        });
                      }}
                    >
                      <View style={[modal.checkbox, isSelected && modal.checkboxActive]}>
                        {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                      <View style={modal.memberAvatar}>
                        <Text style={modal.memberAvatarText}>
                          {m.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={modal.memberName}>{m.name}</Text>
                        <Text style={modal.memberRank}>{m.rank}{m.level ? ` · L${m.level}` : ""}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          ) : (
            <View style={modal.extForm}>
              <TextInput
                style={modal.search}
                placeholder="Name *"
                placeholderTextColor="#A0AEC0"
                value={extName}
                onChangeText={setExtName}
              />
              <TextInput
                style={modal.search}
                placeholder="Role (e.g. Session Musician)"
                placeholderTextColor="#A0AEC0"
                value={extRole}
                onChangeText={setExtRole}
              />
            </View>
          )}

          <TouchableOpacity
            style={[modal.addBtn, saving && { opacity: 0.6 }]}
            onPress={handleAdd}
            disabled={saving}
          >
            <Text style={modal.addBtnText}>
              {saving ? "Adding..." : tab === "member" && selected.size > 1
                ? `Add ${selected.size} Members` : "Add"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TEAL },

  hero: {
    backgroundColor: TEAL, paddingHorizontal: 20,
    paddingBottom: 44, overflow: "hidden",
  },
  decCircle1: {
    position: "absolute", width: 220, height: 220, borderRadius: 110,
    borderWidth: 35, borderColor: "rgba(255,255,255,0.07)", top: -60, right: -60,
  },
  decCircle2: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
    borderWidth: 25, borderColor: "rgba(255,255,255,0.05)", bottom: -40, left: -30,
  },
  heroTopRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  editBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  typePill: {
    alignSelf: "flex-start", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
  },
  typePillText: { fontSize: 11, fontFamily: font.semiBold, color: "#fff" },
  heroTitle: { fontSize: 22, fontFamily: font.extraBold, color: "#fff", letterSpacing: -0.3, marginBottom: 4 },
  heroClient: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 10 },
  heroBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  heroBadgeText: { fontSize: 12, fontFamily: font.semiBold, color: "#fff" },
  heroActions: { flexDirection: "row", gap: 8 },
  heroActionBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  heroActionText: { fontSize: 12, fontFamily: font.bold, color: TEAL },

  // Sheet
  sheet: {
    flex: 1, backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20,
  },
  tabRow: {
    paddingHorizontal: 20, paddingVertical: 16, gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: "#F1F5F9",
  },
  tabPillActive: { backgroundColor: TEAL },
  tabPillText: { fontSize: 13, fontFamily: font.semiBold, color: "#64748B" },
  tabPillTextActive: { color: "#fff" },

  tabContent: { paddingHorizontal: 20, paddingBottom: 120, gap: 12 },
  tabFlex: { flex: 1 },

  // Details
  feeCard: {
    backgroundColor: "#F0FDF9", borderRadius: 16, borderWidth: 1,
    borderColor: "#99F6E4", padding: 16, alignItems: "center",
  },
  feeLabel: { fontSize: 11, fontFamily: font.semiBold, color: TEAL, textTransform: "uppercase", letterSpacing: 0.5 },
  feeAmount: { fontSize: 28, fontFamily: font.extraBold, color: TEAL, letterSpacing: -0.5, marginTop: 4 },

  sectionCard: {
    backgroundColor: "#F8FAFC", borderRadius: 16,
    borderWidth: 1, borderColor: "#E2E8F0", padding: 16, gap: 10,
  },
  sectionCardTitle: { fontSize: 12, fontFamily: font.bold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoLabel: { fontSize: 13, color: "#64748B", width: 70, fontFamily: font.medium },
  infoValue: { fontSize: 13, color: "#1E293B", flex: 1 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  linkText: { fontSize: 13, color: TEAL, flex: 1, fontFamily: font.medium },
  programRow: { flexDirection: "row", gap: 12, paddingVertical: 3 },
  programTime: { fontSize: 13, color: "#94A3B8", width: 50 },
  programTitle: { fontSize: 13, color: "#1E293B", flex: 1 },
  notesText: { fontSize: 13, color: "#475569", lineHeight: 20 },

  // Team
  teamHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  teamCount: { fontSize: 14, color: "#64748B", fontFamily: font.medium },
  addTeamBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  addTeamText: { fontSize: 13, fontFamily: font.bold, color: "#fff" },
  participantCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#F8FAFC", borderRadius: 16,
    borderWidth: 1, borderColor: "#E2E8F0", padding: 12,
  },
  participantAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#E6F7F5", alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontFamily: font.bold, color: TEAL },
  participantInfo: { flex: 1, gap: 2 },
  participantNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  participantName: { fontSize: 14, fontFamily: font.bold, color: "#1E293B" },
  participantRole: { fontSize: 12, color: "#94A3B8" },
  participantPayout: { fontSize: 12, fontFamily: font.semiBold, color: TEAL },
  participantActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  confBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  confText: { fontSize: 10, fontFamily: font.semiBold },
  attendBtn: { padding: 2 },
  attendBtnActive: {},
  externalBadge: { backgroundColor: "#FEF3C7", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  externalText: { fontSize: 10, fontFamily: font.semiBold, color: "#D97706" },
  emptyTeam: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyText: { fontSize: 14, color: "#94A3B8" },
  emptySubText: { fontSize: 12, color: "#CBD5E1", textAlign: "center" },

  // Finance
  financeCards: { flexDirection: "row", gap: 8 },
  financeCard: {
    flex: 1, backgroundColor: "#F8FAFC", borderRadius: 14,
    borderWidth: 1, borderColor: "#E2E8F0",
    padding: 12, alignItems: "center", gap: 4,
  },
  financeCardLabel: { fontSize: 10, color: "#94A3B8", fontFamily: font.semiBold, textTransform: "uppercase", textAlign: "center" },
  financeCardValue: { fontSize: 16, fontFamily: font.extraBold, letterSpacing: -0.3 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 15, fontFamily: font.bold, color: "#1E293B" },
  addExpBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: TEAL },
  addExpText: { fontSize: 13, fontFamily: font.semiBold, color: TEAL },
  expForm: {
    backgroundColor: "#F8FAFC", borderRadius: 16,
    borderWidth: 1, borderColor: "#E2E8F0", padding: 14, gap: 10,
  },
  expInput: {
    backgroundColor: "#F3F4F6", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#1A202C",
  },
  expRow: { flexDirection: "row", gap: 8 },
  catRow: { flexDirection: "row", gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F1F5F9" },
  catChipActive: { backgroundColor: TEAL },
  catChipText: { fontSize: 12, fontFamily: font.semiBold, color: "#64748B" },
  catChipTextActive: { color: "#fff" },
  expSaveBtn: { backgroundColor: TEAL, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  expSaveBtnText: { color: "#fff", fontSize: 14, fontFamily: font.bold },
  emptyExpenses: { textAlign: "center", color: "#94A3B8", paddingVertical: 16, fontSize: 13 },
  expenseRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F8FAFC", borderRadius: 12,
    borderWidth: 1, borderColor: "#E2E8F0", padding: 12,
  },
  expCatBadge: { backgroundColor: "#E0F2FE", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  expCatText: { fontSize: 10, fontFamily: font.semiBold, color: "#0284C7" },
  expenseInfo: { flex: 1, gap: 2 },
  expenseDesc: { fontSize: 13, fontFamily: font.semiBold, color: "#1E293B" },
  expenseDate: { fontSize: 11, color: "#94A3B8" },
  expenseAmount: { fontSize: 13, fontFamily: font.bold, color: "#EF4444" },
  payoutCard: {
    backgroundColor: "#F8FAFC", borderRadius: 16,
    borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden",
  },
  payoutRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  payoutName: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  payoutNameText: { fontSize: 13, fontFamily: font.semiBold, color: "#1E293B" },
  payoutRank: { fontSize: 12, color: "#94A3B8", width: 80, textAlign: "center" },
  payoutAmount: { fontSize: 13, fontFamily: font.bold, color: "#1E293B", width: 70, textAlign: "right" },
  payoutTotal: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 2, borderTopColor: "#E2E8F0",
  },
  payoutTotalLabel: { fontSize: 13, fontFamily: font.bold, color: "#1E293B" },
  payoutTotalValue: { fontSize: 13, fontFamily: font.bold, color: TEAL },
  payoutRemaining: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  payoutRemainingLabel: { fontSize: 12, color: "#64748B" },
  payoutRemainingValue: { fontSize: 13, fontFamily: font.semiBold, color: "#1E293B" },

  // Gear
  gearCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#F8FAFC", borderRadius: 16,
    borderWidth: 1, borderColor: "#E2E8F0", padding: 14,
  },
  gearIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "#E6F7F5", alignItems: "center", justifyContent: "center",
  },
  gearInfo: { flex: 1, gap: 4 },
  gearName: { fontSize: 14, fontFamily: font.bold, color: "#1E293B" },
  gearMeta: { fontSize: 12, color: "#94A3B8" },
  gearBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  gearStatusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  gearStatusText: { fontSize: 11, fontFamily: font.semiBold },
  gearCondition: { fontSize: 12, color: "#64748B" },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 28,
    borderTopRightRadius: 28, paddingBottom: 40, maxHeight: "80%",
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  title: { fontSize: 17, fontFamily: font.bold, color: "#1E293B" },
  tabs: {
    flexDirection: "row", gap: 8, margin: 20,
    backgroundColor: "#F1F5F9", padding: 4, borderRadius: 12,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabBtnActive: { backgroundColor: "#fff" },
  tabBtnText: { fontSize: 13, fontFamily: font.semiBold, color: "#64748B" },
  tabBtnTextActive: { color: "#1E293B" },
  search: {
    backgroundColor: "#F3F4F6", borderRadius: 10, marginHorizontal: 20,
    marginBottom: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#1A202C",
  },
  list: { maxHeight: 260, paddingHorizontal: 20 },
  empty: { textAlign: "center", color: "#94A3B8", paddingVertical: 20, fontSize: 13 },
  memberRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 10, borderRadius: 12, marginBottom: 6,
  },
  memberRowSelected: { backgroundColor: "#E6F7F5" },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: "#CBD5E1",
    alignItems: "center", justifyContent: "center",
  },
  checkboxActive: { backgroundColor: TEAL, borderColor: TEAL },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#E6F7F5", alignItems: "center", justifyContent: "center",
  },
  memberAvatarText: { fontSize: 12, fontFamily: font.bold, color: TEAL },
  memberName: { fontSize: 14, fontFamily: font.semiBold, color: "#1E293B" },
  memberRank: { fontSize: 12, color: "#94A3B8" },
  extForm: { gap: 0 },
  addBtn: {
    backgroundColor: TEAL, borderRadius: 12, marginHorizontal: 20,
    marginTop: 16, paddingVertical: 16, alignItems: "center",
  },
  addBtnText: { color: "#fff", fontSize: 15, fontFamily: font.bold },
});
