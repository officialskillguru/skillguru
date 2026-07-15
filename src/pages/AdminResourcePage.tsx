import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-black">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">Operational overview for sales, counselling, content, and placement teams.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {["New leads", "Course CMS", "Bookings", "Audit logs"].map((item) => (
          <Card key={item}>
            <CardHeader>
              <CardTitle className="text-base">{item}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Supabase managed</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AdminResourcePage({ title }: Readonly<{ title: string }>) {
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Records will appear here from secured Supabase tables.</p>
        </div>
        <Badge variant="secondary">Supabase managed</Badge>
      </div>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-muted-foreground">
        No records loaded in the SPA preview.
      </div>
    </div>
  );
}
