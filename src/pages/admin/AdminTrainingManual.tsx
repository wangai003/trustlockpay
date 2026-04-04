import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, ExternalLink } from "lucide-react";

const PDF_URL = "/TrustLock_Admin_Training_Manual.pdf";

const AdminTrainingManual = () => {
  return (
    <div>
      <AdminHeader title="Admin Training Manual" />
      <div className="p-4 sm:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              TrustLock Admin Training Manual v1.0
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Comprehensive guide covering procedures, policies, chain of command, AI tools,
              messaging protocol, escalation rules, and everything new admin staff need to know.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2" onClick={() => window.open(PDF_URL, "_blank")}>
                <ExternalLink className="w-4 h-4" /> View PDF
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <a href={PDF_URL} download="TrustLock_Admin_Training_Manual.pdf">
                  <Download className="w-4 h-4" /> Download PDF
                </a>
              </Button>
            </div>

            <div className="mt-6 border rounded-lg overflow-hidden bg-muted/30" style={{ height: "70vh" }}>
              <iframe
                src={PDF_URL}
                title="Admin Training Manual"
                className="w-full h-full border-0"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminTrainingManual;
