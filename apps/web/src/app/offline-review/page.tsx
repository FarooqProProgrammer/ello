import type { Metadata } from "next";
import { OfflineReview } from "./offline-review";

export const metadata: Metadata = { title: "Offline flashcards · Ello" };

/** Static page (no database access) so the service worker can serve it offline. */
export default function OfflineReviewPage() {
  return <OfflineReview />;
}
