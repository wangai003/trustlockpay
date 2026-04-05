import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { Shield, LayoutDashboard, Package, MessageSquare, LogOut, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SandboxSession {
  name: string;
  email: string;
  role: "vendor" | "buyer";
  createdAt: string;
  expiresAt: string;
}

const SandboxLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<SandboxSession | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("tl_sandbox_session");
    if (!raw) { navigate("/sandbox/login"); return; }
    try {
      const s = JSON.parse(raw) as SandboxSession;
      if (new Date(s.expiresAt) < new Date()) {
        localStorage.removeItem("tl_sandbox_session");
        navigate("/sandbox/login");
        return;
      }
      setSession(s);
    } catch {
      navigate("/sandbox/login");
    }
  }, [navigate]);

  if (!session) return null;

  const base = `/sandbox/${session.role}`;
  const links = [
    { to: base, icon: LayoutDashboard, label: "Overview" },
    { to: `${base}/orders`, icon: Package, label: "Orders" },
    { to: `${base}/messages`, icon: MessageSquare, label: "Messages" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("tl_sandbox_session");
    navigate("/sandbox/login");
  };

  const hoursLeft = Math.max(0, Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 3600000));

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-card flex flex-col shrink-0 hidden md:flex">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">TrustLock Sandbox</span>
          </div>
          <Badge variant="outline" className="mt-2 text-[10px]">
            {session.role === "vendor" ? "Vendor Demo" : "Buyer Demo"}
          </Badge>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {links.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}
              >
                <l.icon className="w-4 h-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{hoursLeft}h remaining</span>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={handleLogout}>
            <LogOut className="w-3 h-3 mr-1" /> Exit Sandbox
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden border-b border-border p-3 flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">Sandbox</span>
            <Badge variant="outline" className="text-[10px]">{session.role}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </header>

        {/* Sandbox banner */}
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-center">
          <p className="text-xs text-primary font-medium">
            🧪 Sandbox Mode — Welcome, {session.name}. No real payments are processed.
          </p>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex border-b border-border bg-card">
          {links.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex-1 flex flex-col items-center gap-1 py-2 text-[11px] ${active ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
              >
                <l.icon className="w-4 h-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet context={session} />
        </main>
      </div>
    </div>
  );
};

export default SandboxLayout;
