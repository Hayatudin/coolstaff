import DashboardLayout from "@/components/layout/DashboardLayout";

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-lavender text-text-primary">
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </div>
  );
}
