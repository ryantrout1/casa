import { redirect } from "next/navigation";

// Fiestas moved to Website. Kept as a redirect so bookmarks keep working.
export default function FiestasMoved() {
  redirect("/cocina/website");
}
