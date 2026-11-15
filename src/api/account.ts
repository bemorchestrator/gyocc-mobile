import client from "./client";

export type DeletionMethod = "password" | "apple" | "email-code";

export type DeletionOptions = {
  email: string;
  /** Ways this account can confirm deletion, most convenient first. */
  methods: DeletionMethod[];
  /** True for the organization owner, who must hand over ownership first. */
  blocked: boolean;
};

export type DeletionProof =
  | { password: string }
  | { code: string }
  | { apple: { identityToken: string; authorizationCode: string | null; nonce: string } };

export async function getDeletionOptions(): Promise<DeletionOptions> {
  const { data } = await client.get("/api/account/deletion");
  return data as DeletionOptions;
}

export async function sendDeletionCode(): Promise<void> {
  await client.post("/api/account/deletion/code");
}

/** Permanently delete the signed-in account. */
export async function deleteMyAccount(proof: DeletionProof): Promise<void> {
  await client.post("/api/account/deletion", proof);
}
