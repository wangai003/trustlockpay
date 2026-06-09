import VendorHeader from "@/components/vendor/VendorHeader";
import WidgetThemeEditor from "@/components/shared/WidgetThemeEditor";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";

const VendorWidgetTheme = () => {
  const { user } = useAuth();
  return (
    <div>
      <VendorHeader title="Widget Theme Editor" />
      <div className="p-3 sm:p-6 space-y-4 max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">
              Customize how your TrustLock checkout widget looks on your website — colors, fonts, radius, and logo.
              Changes apply to all live widget embeds for this vendor account.
            </p>
          </CardContent>
        </Card>
        {user?.id && <WidgetThemeEditor vendorId={user.id} />}
      </div>
    </div>
  );
};

export default VendorWidgetTheme;
