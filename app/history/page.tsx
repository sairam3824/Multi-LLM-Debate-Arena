import Link from "next/link";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const debates = await db.debate.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Badge variant="outline">History</Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Past debates</h1>
        <p className="max-w-2xl text-muted-foreground">
          Every saved debate persists in SQLite through Prisma so you can revisit the transcript and scoring spread later.
        </p>
      </div>

      <div className="grid gap-4">
        {debates.length === 0 ? (
          <Card className="border-dashed bg-white/70">
            <CardContent className="py-10 text-sm text-muted-foreground">
              No debates saved yet. Run one from the arena and it will show up here.
            </CardContent>
          </Card>
        ) : (
          debates.map((debate) => (
            <Link key={debate.id} href={`/history/${debate.id}`}>
              <Card className="transition-transform hover:-translate-y-0.5">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{debate.claim}</CardTitle>
                      <CardDescription>
                        {debate.debaterAModelLabel} vs {debate.debaterBModelLabel} · Judge {debate.judgeModelLabel}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{debate.finalWinner ?? debate.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
                  <p>{format(debate.createdAt, "PPP p")}</p>
                  <p>
                    Totals A {debate.totalCoherenceA + debate.totalEvidenceA + debate.totalRhetoricA} · B{" "}
                    {debate.totalCoherenceB + debate.totalEvidenceB + debate.totalRhetoricB}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
