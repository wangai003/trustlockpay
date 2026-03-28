import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Zap, FileText } from "lucide-react";

type Template = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  auto_trigger_mode: string;
};

type Rule = {
  id: string;
  milestone_key: string;
  milestone_label: string | null;
  member_id: string | null;
  auto_assign: boolean;
  sort_order: number;
  instructions: string | null;
};

type Member = {
  id: string;
  display_name: string | null;
  user_id: string;
};

interface Props {
  workspaceId: string;
  members: Member[];
  disabled?: boolean;
}

const TeamTemplateManager = ({ workspaceId, members, disabled }: Props) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newMode, setNewMode] = useState("manual");
  const [ruleKey, setRuleKey] = useState("");
  const [ruleLabel, setRuleLabel] = useState("");
  const [ruleMemberId, setRuleMemberId] = useState("");
  const [ruleInstructions, setRuleInstructions] = useState("");
  const [ruleAutoAssign, setRuleAutoAssign] = useState(true);

  useEffect(() => { fetchTemplates(); }, [workspaceId]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("team_assignment_templates")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });
    setTemplates((data as any[]) || []);
  };

  const fetchRules = async (templateId: string) => {
    const { data } = await supabase
      .from("team_template_rules")
      .select("*")
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true });
    setRules((data as any[]) || []);
  };

  const createTemplate = async () => {
    if (!newName.trim()) return toast.error("Name required");
    const { error } = await supabase.from("team_assignment_templates").insert({
      workspace_id: workspaceId,
      name: newName,
      description: newDesc || null,
      auto_trigger_mode: newMode,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Template created");
    setShowCreate(false);
    setNewName("");
    setNewDesc("");
    fetchTemplates();
  };

  const addRule = async () => {
    if (!ruleKey || !selectedTemplate) return toast.error("Milestone key required");
    const { error } = await supabase.from("team_template_rules").insert({
      template_id: selectedTemplate.id,
      milestone_key: ruleKey,
      milestone_label: ruleLabel || ruleKey,
      member_id: ruleMemberId || null,
      auto_assign: ruleAutoAssign,
      sort_order: rules.length,
      instructions: ruleInstructions || null,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Rule added");
    setShowAddRule(false);
    setRuleKey("");
    setRuleLabel("");
    setRuleMemberId("");
    setRuleInstructions("");
    fetchRules(selectedTemplate.id);
  };

  const deleteRule = async (ruleId: string) => {
    await supabase.from("team_template_rules").delete().eq("id", ruleId);
    toast.success("Rule removed");
    if (selectedTemplate) fetchRules(selectedTemplate.id);
  };

  const setDefault = async (templateId: string) => {
    // Unset all defaults first
    await supabase.from("team_assignment_templates").update({ is_default: false } as any).eq("workspace_id", workspaceId);
    await supabase.from("team_assignment_templates").update({ is_default: true } as any).eq("id", templateId);
    toast.success("Default template set");
    fetchTemplates();
  };

  const openTemplate = (t: Template) => {
    setSelectedTemplate(t);
    fetchRules(t.id);
  };

  if (selectedTemplate) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)} className="mb-1">← Templates</Button>
            <CardTitle className="text-base flex items-center gap-2">
              {selectedTemplate.name}
              {selectedTemplate.is_default && <Badge className="bg-primary text-xs">Default</Badge>}
              <Badge variant="outline" className="text-xs">{selectedTemplate.auto_trigger_mode === "auto" ? "Auto-match" : "Manual"}</Badge>
            </CardTitle>
          </div>
          {!disabled && (
            <Button size="sm" onClick={() => setShowAddRule(true)}><Plus className="w-4 h-4 mr-1" /> Add Rule</Button>
          )}
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules configured. Add milestone-to-member mappings.</p>
          ) : (
            <div className="space-y-2">
              {rules.map((r, i) => {
                const member = members.find((m) => m.id === r.member_id);
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-6">{i + 1}</span>
                      <div>
                        <p className="font-medium text-sm">{r.milestone_label || r.milestone_key}</p>
                        <p className="text-xs text-muted-foreground">
                          → {member ? member.display_name || member.user_id.slice(0, 8) : "Unassigned"}
                          {r.auto_assign ? " (auto)" : " (manual)"}
                        </p>
                        {r.instructions && <p className="text-xs text-muted-foreground italic mt-0.5">{r.instructions}</p>}
                      </div>
                    </div>
                    {!disabled && (
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteRule(r.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Assignment Rule</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Milestone Key</Label>
                  <Input value={ruleKey} onChange={(e) => setRuleKey(e.target.value)} placeholder="e.g. assay_report" />
                </div>
                <div>
                  <Label>Label</Label>
                  <Input value={ruleLabel} onChange={(e) => setRuleLabel(e.target.value)} placeholder="e.g. Submit Assay Report" />
                </div>
                <div>
                  <Label>Assign To</Label>
                  <Select value={ruleMemberId} onValueChange={setRuleMemberId}>
                    <SelectTrigger><SelectValue placeholder="Select member (or leave for manual)" /></SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.display_name || m.user_id.slice(0, 8)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={ruleAutoAssign} onCheckedChange={setRuleAutoAssign} />
                  <Label className="text-sm">Auto-assign when order arrives</Label>
                </div>
                <div>
                  <Label>Instructions</Label>
                  <Textarea value={ruleInstructions} onChange={(e) => setRuleInstructions(e.target.value)} placeholder="Task instructions for this member" />
                </div>
              </div>
              <DialogFooter><Button onClick={addRule}>Add Rule</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2"><Zap className="w-4 h-4" /> Assignment Templates</CardTitle>
        {!disabled && (
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Template</Button>
        )}
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No templates yet. Create one to enable auto-assignment for new orders.</p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => openTemplate(t)}>
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.is_default && <Badge className="bg-primary text-xs">Default</Badge>}
                  <Badge variant="outline" className="text-xs">{t.auto_trigger_mode === "auto" ? "Auto" : "Manual"}</Badge>
                  {!t.is_default && !disabled && (
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDefault(t.id); }}>Set Default</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Assignment Template</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Standard Gold Export" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="When to use this template" />
              </div>
              <div>
                <Label>Trigger Mode</Label>
                <Select value={newMode} onValueChange={setNewMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual — Team Lead links orders</SelectItem>
                    <SelectItem value="auto">Auto — Match by industry automatically</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={createTemplate}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TeamTemplateManager;
