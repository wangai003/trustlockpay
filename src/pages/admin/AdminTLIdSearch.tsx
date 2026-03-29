import { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Copy, Check, Tag } from "lucide-react";
import { searchTLIds, getTLIdsByRole, type TLIdEntry } from "@/lib/tlIdRegistry";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AdminTLIdSearch = () => {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const allResults = query.trim()
    ? searchTLIds(query.trim())
    : roleFilter !== "all"
      ? getTLIdsByRole(roleFilter as TLIdEntry["role"])
      : Object.values(searchTLIds("TL-"));

  const results = roleFilter !== "all"
    ? allResults.filter((e) => e.role === roleFilter)
    : allResults;

  const handleCopy = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success(`Copied: ${id}`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const roleColor: Record<string, string> = {
    vendor: "bg-primary/15 text-primary",
    buyer: "bg-accent/15 text-accent-foreground",
    shared: "bg-muted text-muted-foreground",
    admin: "bg-destructive/15 text-destructive",
  };

  return (
    <div>
      <AdminHeader title="TL-ID Diagnostic Search" />
      <div className="p-3 sm:p-6 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Component Identifier Lookup
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Enter a TL-ID code reported by a user, or search by keyword to locate any interactive element in the platform.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by TL-ID, label, or description (e.g. TL-V-TXN-BTN-SHIP)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-[10px] text-muted-foreground">
              {results.length} identifier{results.length !== 1 ? "s" : ""} found
            </p>
          </CardContent>
        </Card>

        <div className="space-y-1.5">
          {results.map((entry) => (
            <Card key={entry.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {entry.id}
                    </code>
                    <Badge variant="outline" className={`text-[9px] ${roleColor[entry.role] || ""}`}>
                      {entry.role}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">
                      {entry.type}
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold">{entry.label}</p>
                  <p className="text-[10px] text-muted-foreground">{entry.description}</p>
                  <p className="text-[9px] text-muted-foreground/70">Page: {entry.page}</p>
                </div>
                <button
                  onClick={() => handleCopy(entry.id)}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors shrink-0"
                >
                  {copiedId === entry.id ? (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              </CardContent>
            </Card>
          ))}

          {results.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No identifiers match your search.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Try a shorter query or change the role filter.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTLIdSearch;
