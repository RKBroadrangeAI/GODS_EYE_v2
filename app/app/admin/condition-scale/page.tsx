import { requireRoles } from "@/lib/auth";
import { conditionScaleReference } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ConditionScalePage() {
  await requireRoles(["admin", "management"]);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Condition Scale</h1>
        <p className="text-sm text-zinc-500">Read-only grading reference for marketplace consistency.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Reference Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Scale</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conditionScaleReference.map((row) => (
                <TableRow key={row.source}>
                  <TableCell>{row.source}</TableCell>
                  <TableCell>{row.scale}</TableCell>
                  <TableCell>{row.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
