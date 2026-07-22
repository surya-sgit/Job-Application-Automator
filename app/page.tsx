import TailorApp from "@/components/TailorApp";
import LandingPage from "@/components/LandingPage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getCurrentUser } from "@/lib/session";
import { USE_DB } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Local mode (no database): single-user, no accounts — straight to the app.
  if (!USE_DB) return <ErrorBoundary><TailorApp /></ErrorBoundary>;

  const user = await getCurrentUser();
  return user ? <ErrorBoundary><TailorApp /></ErrorBoundary> : <LandingPage />;
}
