import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser((await headers()).get("cookie") ?? "");
  redirect(user ? "/workspace" : "/login");
}
