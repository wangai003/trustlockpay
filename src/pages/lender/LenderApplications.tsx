import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FileText, CheckCircle, XCircle, MessageSquare, Clock, 
  DollarSign, TrendingUp, AlertTriangle, Eye, Filter,
  ArrowRight, Building2, Calendar, ChevronDown, ChevronUp
} from "lucide-react";

interface Application {
  id: string;
  vendor_name: string;
  vendor_industry: string;
  requested_amount: number;
  proposed_tenure_days: number;
  purpose_type: string;
  status: string;
  submitted_at: string;
  item_count: number;
  has_documents: boolean;
}

interface ApplicationDetail extends Application {
  description: string | null;
  trade_scope: string | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_cost: number;
  }>;
  documents: Array<{
    id: string;
    file_name: string;
    file_url: string;
    uploaded_at: string;
  }>;
  messages: Array<{
    id: string;
    sender_role: string;
    body: string;
    created_at: string;
  }>;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  submitted: { label: "Pending Review", color: "bg-yellow-500/15 text-yellow-600", icon: Clock },
  under_review: { label: "Under Review", color: "bg-blue-500/15 text-blue-600", icon: Eye },
  counter_offered: { label: "Counter Offered", color: "bg-purple-500/15 text-purple-600", icon: MessageSquare },
  approved: { label: "Approved", color: "bg-green-500/15 text-green-600", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-500/15 text-red-600", icon: XCircle },
  withdrawn: { label: "Withdrawn", color: "bg-gray-500/15 text-gray-600", icon: XCircle },
};

const LenderApplications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ApplicationDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [stats, setStats] = useState({
    totalReceived: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    totalExposure: 0,
  });

  useEffect(() => {
    if (!user) return;
    fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lender-workflow`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ action: "list_applications" }),
        }
      );
      const data = await resp.json();
      if (data.applications) {
        setApplications(data.applications);
        calculateStats(data.applications);
      }
    } catch {
      toast.error("Failed to load applications");
    }
    setLoading(false);
  };

  const calculateStats = (apps: Application[]) => {
    setStats({
      totalReceived: apps.length,
      pendingReview: apps.filter(a => a.status === "submitted" || a.status === "under_review").length,
      approved: apps.filter(a => a.status === "approved").length,
      rejected: apps.filter(a => a.status === "rejected").length,
      totalExposure: apps
        .filter(a => a.status === "approved")
        .reduce((sum, a) => sum + a.requested_amount, 0),
    });
  };

  const viewApplicationDetail = async (appId: string) => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lender-workflow`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ action: "get_application", application_id: appId }),
        }
      );
      const data = await resp.json();
      if (data.application) {
        setSelectedApp(data.application);
        setDetailOpen(true);
      }
    } catch {
      toast.error("Failed to load application details");
    }
  };

  const handleAction = async (action: string, payload?: any) => {
    if (!selectedApp) return;
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lender-workflow`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            action,
            application_id: selectedApp.id,
            ...payload,
          }),
        }
      );
      const data = await resp.json();
      if (data.success) {
        toast.success(data.message || "Action completed");
        setDetailOpen(false);
        fetchApplications();
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch {
      toast.error("Failed to process action");
    }
  };

  const filteredApps = activeTab === "all" 
    ? applications 
    : applications.filter(a => {
        if (activeTab === "pending") return ["submitted", "under_review"].includes(a.status);
        if (activeTab === "counter") return a.status === "counter_offered";
        if (activeTab === "decided") return ["approved", "rejected"].includes(a.status);
        return true;
      });

  return (
    <div className="min-h-screen bg-background">
      <LenderHeader title="Financing Applications" />
      
      <div className="p-6 space-y-6">
        {/* Stats Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalReceived}</p>
                  <p className="text-xs text-muted-foreground">Total Received</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingReview}</p>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${(stats.totalExposure / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-muted-foreground">Total Exposure</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Applications List */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Applications Queue</CardTitle>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
                    <TabsTrigger value="counter" className="text-xs">Counter</TabsTrigger>
                    <TabsTrigger value="decided" className="text-xs">Decided</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : filteredApps.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No applications found</p>
                  <p className="text-sm mt-1">Applications will appear here when vendors submit financing requests</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredApps.map((app) => {
                    const status = statusConfig[app.status] || statusConfig.submitted;
                    const StatusIcon = status.icon;
                    return (
                      <motion.div
                        key={app.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => viewApplicationDetail(app.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{app.vendor_name}</h3>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {app.vendor_industry}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3.5 h-3.5" />
                                ${app.requested_amount.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {app.proposed_tenure_days} days
                              </span>
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" />
                                {app.purpose_type}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge className={`${status.color} gap-1`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Application Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Application from {selectedApp.vendor_name}
                  <Badge className={statusConfig[selectedApp.status]?.color}>
                    {statusConfig[selectedApp.status]?.label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Overview */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Amount Requested</p>
                      <p className="text-xl font-bold">${selectedApp.requested_amount.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Tenure</p>
                      <p className="text-xl font-bold">{selectedApp.proposed_tenure_days} days</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Purpose</p>
                      <p className="text-sm font-semibold truncate">{selectedApp.purpose_type}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Description */}
                {selectedApp.description && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {selectedApp.description}
                    </p>
                  </div>
                )}

                {/* Line Items */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Itemized Request</h4>
                  <div className="border rounded-lg divide-y divide-border">
                    {selectedApp.items?.map((item, idx) => (
                      <div key={item.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{item.description}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold">${(item.unit_cost * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                    <div className="p-3 bg-muted/30 flex items-center justify-between font-semibold">
                      <span>Total</span>
                      <span>${selectedApp.requested_amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                {selectedApp.documents && selectedApp.documents.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Supporting Documents</h4>
                    <div className="space-y-2">
                      {selectedApp.documents.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {["submitted", "under_review"].includes(selectedApp.status) && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleAction("start_review")}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Start Review
                    </Button>
                    <Button 
                      variant="default" 
                      className="flex-1"
                      onClick={() => {
                        const amount = prompt("Enter approved amount:", selectedApp.requested_amount.toString());
                        const rate = prompt("Enter interest rate (%):", "12");
                        const tenure = prompt("Enter tenure (days):", selectedApp.proposed_tenure_days.toString());
                        if (amount && rate && tenure) {
                          handleAction("approve", {
                            approved_amount: parseFloat(amount),
                            interest_rate_percent: parseFloat(rate),
                            approved_tenure_days: parseInt(tenure),
                          });
                        }
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        const reason = prompt("Enter rejection reason:");
                        if (reason) handleAction("reject", { rejection_reason: reason });
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}

                {selectedApp.status === "counter_offered" && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => handleAction("withdraw_counter")}
                    >
                      Withdraw Counter
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LenderApplications;
