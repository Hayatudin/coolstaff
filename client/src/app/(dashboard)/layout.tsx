import DashboardLayout from "@/components/layout/DashboardLayout";
import ProgressBar from "@/components/ui/ProgressBar";

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-lavender text-text-primary">
      <ProgressBar />
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </div>
  );
}
