import { supabase } from "./supabaseClient";
import type { TownName } from "./types";

export interface CustomerSignupInput {
  name: string;
  surname: string;
  idNumber: string;
  address: string;
  phone: string;
  email: string;
  password: string;
}

export interface RunnerSignupInput {
  name: string;
  surname: string;
  idNumber: string;
  address: string;
  phone: string;
  email: string;
  password: string;
  town: TownName;
  headshot: File;
  idDocument: File;
  bankProof: File;
  addressProof: File;
}

async function uploadKycFile(userId: string, kind: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("runner-kyc").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/**
 * Both signup functions pass all profile fields as auth `options.data`
 * metadata rather than inserting into `profiles` from the client. A
 * database trigger (see backend/sql/schema_fixes.sql, `handle_new_user`)
 * reads that metadata and provisions `profiles` (+ `customer_profiles` /
 * `wallets` for customers) as part of the signup transaction itself.
 *
 * This matters because `supabase.auth.signUp()` only returns an active
 * session immediately if your Supabase project has "Confirm email" turned
 * off. If it's on, `data.session` is null until the user clicks the
 * confirmation link — so `auth.uid()` is null and any client-side insert
 * guarded by `id = auth.uid()` RLS would fail with 403, even though the
 * signup itself "succeeded". Provisioning via a trigger sidesteps that
 * entirely, since it runs server-side with elevated privileges regardless
 * of session state.
 */
export async function signUpCustomer(input: CustomerSignupInput) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        role: "customer",
        name: input.name,
        surname: input.surname,
        phone: input.phone,
        id_number: input.idNumber,
        address: input.address,
      },
    },
  });
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign-up did not return a user — please try again.");

  return {
    ...authData,
    emailConfirmationRequired: !authData.session,
  };
}

export async function signUpRunner(input: RunnerSignupInput) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        role: "runner",
        name: input.name,
        surname: input.surname,
        phone: input.phone,
      },
    },
  });
  if (authError) throw authError;
  const userId = authData.user?.id;
  if (!userId) throw new Error("Sign-up did not return a user — please try again.");

  // The KYC upload + runner_applications insert both need an active session
  // (storage RLS and the "applications: applicant insert own" policy both
  // check auth.uid()). If email confirmation is required, there isn't one
  // yet — the profiles row still gets created (by the trigger), but the
  // application has to be finished after the user confirms their email and
  // logs in. See completeRunnerApplication below.
  if (!authData.session) {
    return { ...authData, emailConfirmationRequired: true, applicationSubmitted: false };
  }

  await submitRunnerApplication(userId, input);
  return { ...authData, emailConfirmationRequired: false, applicationSubmitted: true };
}

async function submitRunnerApplication(
  userId: string,
  input: Pick<RunnerSignupInput, "town" | "idNumber" | "address" | "headshot" | "idDocument" | "bankProof" | "addressProof">
) {
  const [headshotPath, idDocPath, bankPath, addressPath] = await Promise.all([
    uploadKycFile(userId, "headshot", input.headshot),
    uploadKycFile(userId, "id-document", input.idDocument),
    uploadKycFile(userId, "bank-proof", input.bankProof),
    uploadKycFile(userId, "address-proof", input.addressProof),
  ]);

  const { error: appError } = await supabase.from("runner_applications").insert({
    user_id: userId,
    town: input.town,
    id_number: input.idNumber,
    address: input.address,
    headshot_path: headshotPath,
    id_document_path: idDocPath,
    bank_proof_path: bankPath,
    address_proof_path: addressPath,
  });
  if (appError) throw appError;
}

/**
 * For a runner whose signup happened while email confirmation was pending
 * (so their KYC documents never got uploaded / application never got
 * created). Call this right after login if `fetchMyApplication()` in
 * runner.ts comes back empty for a "runner"-role profile.
 */
export async function completeRunnerApplication(
  input: Pick<RunnerSignupInput, "town" | "idNumber" | "address" | "headshot" | "idDocument" | "bankProof" | "addressProof">
) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Not logged in");
  await submitRunnerApplication(userId, input);
}

export async function logIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Fetches the caller's profile + role, for routing after login. */
export async function getCurrentUserRole(): Promise<
  { role: "customer" | "runner" | "supervisor" | "admin"; userId: string } | null
> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (error) throw error;
  return { role: data.role, userId };
}