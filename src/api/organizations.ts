import client from "./client";

/**
 * Organization membership — every feature route on the backend is org-scoped
 * and returns 403 NO_ACTIVE_ORGANIZATION without one. A freshly registered
 * account belongs to no organization yet, so the app has to offer a way in:
 * accept an invitation, or create an organization of your own.
 */

export interface MyOrganization {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
}

export interface OrgInvitation {
  id: string;
  organizationId: string;
  organizationName: string;
  role: string;
  expiresAt: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
}

export async function listMyOrganizations(): Promise<MyOrganization[]> {
  const { data } = await client.get("/api/organizations/mine", { skipErrorLog: true } as never);
  const raw = asRecord(data).organizations;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const r = asRecord(item);
      const role = r.role === "owner" || r.role === "admin" ? r.role : "member";
      return {
        id: String(r.id ?? r._id ?? ""),
        name: String(r.name ?? ""),
        slug: String(r.slug ?? ""),
        role,
      } as MyOrganization;
    })
    .filter((org) => org.id.length > 0);
}

export async function listMyInvitations(): Promise<OrgInvitation[]> {
  const { data } = await client.get("/api/organizations/invitations", {
    skipErrorLog: true,
  } as never);
  const raw = asRecord(data).invitations;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const r = asRecord(item);
      return {
        id: String(r.id ?? ""),
        organizationId: String(r.organizationId ?? ""),
        organizationName: String(r.organizationName ?? "An organization"),
        role: String(r.role ?? "member"),
        expiresAt: typeof r.expiresAt === "string" ? r.expiresAt : null,
      } as OrgInvitation;
    })
    .filter((inv) => inv.id.length > 0);
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  await client.post(`/api/organizations/invitations/${invitationId}/accept`);
}

export async function rejectInvitation(invitationId: string): Promise<void> {
  await client.post(`/api/organizations/invitations/${invitationId}/reject`);
}

export async function createOrganization(name: string): Promise<MyOrganization | null> {
  const { data } = await client.post("/api/organizations", { name: name.trim() });
  const org = asRecord(asRecord(data).organization);
  const id = String(org.id ?? "");
  if (!id) return null;
  return { id, name: String(org.name ?? name), slug: String(org.slug ?? ""), role: "owner" };
}

export async function switchOrganization(organizationId: string): Promise<void> {
  await client.post("/api/organizations/switch", { organizationId });
}
