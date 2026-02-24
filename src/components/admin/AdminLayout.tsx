import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  HelpCircle, 
  Users,
  Flag,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'داشبورد' },
  { path: '/admin/content', icon: BookOpen, label: 'مدیریت محتوا' },
  { path: '/admin/questions', icon: HelpCircle, label: 'سوالات' },
  { path: '/admin/users', icon: Users, label: 'کاربران' },
  { path: '/admin/reports', icon: Flag, label: 'گزارشات' },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  return (
    <nav className="flex-1 p-4 space-y-1">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentNav = navItems.find((item) => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === item.path;
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-60 bg-card border-l border-border flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <h1 className="text-lg font-bold text-foreground">🎛️ پنل مدیریت</h1>
        </div>
        <NavLinks />
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={() => signOut()}
          >
            <LogOut className="h-5 w-5" />
            خروج
          </Button>
        </div>
      </aside>

      {/* ── Mobile Drawer Backdrop ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <aside
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-64 bg-card border-l border-border flex flex-col transition-transform duration-300 md:hidden',
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h1 className="text-base font-bold text-foreground">🎛️ پنل مدیریت</h1>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <NavLinks onNavigate={() => setDrawerOpen(false)} />
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={() => signOut()}
          >
            <LogOut className="h-5 w-5" />
            خروج
          </Button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-30">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">
            {currentNav?.label ?? 'پنل مدیریت'}
          </span>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
