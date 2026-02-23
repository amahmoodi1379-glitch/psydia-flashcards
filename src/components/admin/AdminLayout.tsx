import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  HelpCircle, 
  Users,
  Flag,
  LogOut
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

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-l border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">🎛️ پنل مدیریت</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
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
      
      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
