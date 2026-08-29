import { OperationsCenterPanel } from "@/components/admin/operations-center-panel";
import { getOperationsCenterData } from "@/lib/admin/operations";
import { requireAdmin } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export default async function AdminOperationsPage() {
  requireAdmin();
  const data = await getOperationsCenterData();

  return <OperationsCenterPanel data={data} />;
}
