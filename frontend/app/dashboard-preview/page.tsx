import type { Metadata } from "next";

import { LandingDashboardPreview } from "../components/LandingDashboardPreview";

export const metadata: Metadata = {
    robots: { follow: false, index: false },
    title: "JobHazel Dashboard Preview",
};

export default function DashboardPreviewPage() {
    return <LandingDashboardPreview />;
}
