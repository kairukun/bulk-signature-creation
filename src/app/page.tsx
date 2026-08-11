import { redirect } from "next/navigation";

/** Internal tool — no public marketing site. */
export default function HomePage() {
  redirect("/app");
}
