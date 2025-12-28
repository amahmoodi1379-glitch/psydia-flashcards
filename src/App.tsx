import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TelegramGuard } from "@/components/TelegramGuard";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import ProfilePage from "./pages/ProfilePage";
import ReviewPage from "./pages/ReviewPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ContentManager from "./pages/admin/ContentManager";
import QuestionsManager from "./pages/admin/QuestionsManager";
import UsersManager from "./pages/admin/UsersManager";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Main app routes - Telegram only */}
                <Route path="/" element={<TelegramGuard><Index /></TelegramGuard>} />
                <Route path="/profile" element={<TelegramGuard><ProfilePage /></TelegramGuard>} />
                <Route path="/review" element={<TelegramGuard><ReviewPage /></TelegramGuard>} />
                <Route path="/subscription" element={<TelegramGuard><SubscriptionPage /></TelegramGuard>} />
                <Route path="/leaderboard" element={<TelegramGuard><LeaderboardPage /></TelegramGuard>} />
                
                {/* Admin routes - no Telegram guard, uses email auth */}
                <Route path="/admin" element={<AdminGuard><AdminLayout><AdminDashboard /></AdminLayout></AdminGuard>} />
                <Route path="/admin/content" element={<AdminGuard><AdminLayout><ContentManager /></AdminLayout></AdminGuard>} />
                <Route path="/admin/questions" element={<AdminGuard><AdminLayout><QuestionsManager /></AdminLayout></AdminGuard>} />
                <Route path="/admin/users" element={<AdminGuard><AdminLayout><UsersManager /></AdminLayout></AdminGuard>} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
