"use client";

import { useRouter } from "next/navigation";

export default function RetryPatientHomeButton({ label }: { label: string }) {
  const router = useRouter();
  return <button type="button" onClick={() => router.refresh()}>{label}</button>;
}
