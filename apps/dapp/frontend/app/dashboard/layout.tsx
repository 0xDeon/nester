import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Dashboard | Nester",
    description: "Manage your Nester portfolio",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
