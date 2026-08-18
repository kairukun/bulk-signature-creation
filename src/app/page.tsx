import { redirect } from "next/navigation";

/** Public employee signature studio. Admin tool lives at /app. */
export default function HomePage() {
  redirect("/signature");
}
