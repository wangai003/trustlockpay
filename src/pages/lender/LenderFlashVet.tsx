import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Bot } from "lucide-react";

const LenderFlashVet = () => (
  <div>
    <LenderHeader title="FlashVet AI" />
    <div className="p-4 sm:p-6">
      <Card>
        <CardContent className="p-8 text-center">
          <Bot className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">FlashVet AI Assistant</h3>
          <p className="text-sm text-muted-foreground">AI-powered research, document forensics, and platform Q&A. Ask about vendor histories, industry risk profiles, or compliance requirements.</p>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default LenderFlashVet;
