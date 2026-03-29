import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Search, CheckSquare, FileText, Download, BookOpen, Upload, Lock, Unlock, Eye
} from "lucide-react";
import { industries, INDUSTRY_MILESTONE_MAP, platformTools } from "./industryPlaybookData";

const IndustryPlaybookView = () => {
  const [search, setSearch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const filtered = industries.filter(ind =>
    ind.name.toLowerCase().includes(search.toLowerCase()) ||
    ind.desc.toLowerCase().includes(search.toLowerCase())
  );

  const selected = selectedIndustry ? industries.find(i => i.id === selectedIndustry) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Industry Capabilities Playbook</h2>
          <p className="text-sm text-muted-foreground">Dynamic escrow workflows across {industries.length} emerging market industries</p>
        </div>
        <a
          href="/__l5e/documents/TrustLock_Industry_Capabilities_Playbook_v1.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Download className="w-4 h-4" />
          Download Full PDF
        </a>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search industries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Platform Tools Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Platform Tools Available to All Industries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {platformTools.map(tool => (
              <div key={tool.name} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <tool.icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{tool.name}</p>
                  <p className="text-[10px] text-muted-foreground">{tool.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Industry Grid or Detail */}
      {selected ? (
        <div className="space-y-4">
          <button onClick={() => setSelectedIndustry(null)} className="text-sm text-primary hover:underline">
            ← Back to all industries
          </button>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <selected.icon className={`w-8 h-8 ${selected.color}`} />
                <div>
                  <CardTitle>{selected.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selected.desc}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="milestones">
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  <TabsTrigger value="milestones">Milestone Template</TabsTrigger>
                  <TabsTrigger value="workflow">Workflow Stages</TabsTrigger>
                  <TabsTrigger value="buyer">Buyer Capabilities</TabsTrigger>
                  <TabsTrigger value="vendor">Vendor Capabilities</TabsTrigger>
                </TabsList>
                <TabsContent value="milestones" className="space-y-3">
                  {(INDUSTRY_MILESTONE_MAP[selected.id] || []).length > 0 ? (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        Document-gated escrow milestones with fund allocation. Each stage can require uploads before funds release.
                      </p>
                      {INDUSTRY_MILESTONE_MAP[selected.id].map((ms, i) => (
                        <Card key={i} className="border-border/60">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="shrink-0 text-xs font-mono">{i + 1}</Badge>
                                <span className="text-sm font-semibold">{ms.name}</span>
                              </div>
                              <Badge className="bg-primary/10 text-primary text-xs">{ms.percentage}%</Badge>
                            </div>
                            <Progress value={ms.percentage} className="h-1.5" />
                            <p className="text-xs text-muted-foreground">{ms.description}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant={ms.documentMode === "required" ? "destructive" : ms.documentMode === "optional" ? "secondary" : "outline"} className="text-[10px] gap-1">
                                {ms.documentMode === "required" ? <Lock className="w-3 h-3" /> : ms.documentMode === "optional" ? <Unlock className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                Docs: {ms.documentMode}
                              </Badge>
                              {ms.requiresObserver && (
                                <Badge variant="secondary" className="text-[10px] gap-1">
                                  <Eye className="w-3 h-3" />
                                  Observer Required
                                </Badge>
                              )}
                            </div>
                            {ms.documents.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {ms.documents.map((doc, di) => (
                                  <Badge key={di} variant="outline" className="text-[10px] gap-1 font-normal">
                                    <Upload className="w-2.5 h-2.5" />
                                    {doc}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mt-2">
                        <strong>Total allocation:</strong> {INDUSTRY_MILESTONE_MAP[selected.id].reduce((s, m) => s + m.percentage, 0)}% •
                        <strong> Doc-gated stages:</strong> {INDUSTRY_MILESTONE_MAP[selected.id].filter(m => m.documentMode === "required").length} •
                        <strong> Observer stages:</strong> {INDUSTRY_MILESTONE_MAP[selected.id].filter(m => m.requiresObserver).length}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No structured milestone template for this industry yet.</p>
                  )}
                </TabsContent>
                <TabsContent value="workflow" className="space-y-2">
                  {selected.stages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                      <Badge variant="outline" className="shrink-0 text-xs">{i + 1}</Badge>
                      <span className="text-sm">{stage}</span>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="buyer" className="space-y-2">
                  {selected.buyerCaps.map((cap, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="vendor" className="space-y-2">
                  {selected.vendorCaps.map((cap, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ind => (
            <Card
              key={ind.id}
              className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
              onClick={() => setSelectedIndustry(ind.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <ind.icon className={`w-6 h-6 ${ind.color}`} />
                  <h3 className="font-bold text-sm text-foreground">{ind.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{ind.desc}</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{ind.stages.length} Stages</Badge>
                  <Badge variant="outline" className="text-[10px]">{ind.buyerCaps.length + ind.vendorCaps.length} Capabilities</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default IndustryPlaybookView;
