import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TelegramAuthGate } from "@/components/auth/TelegramAuthGate";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import ExamPage from "./pages/ExamPage";
import ProfilePage from "./pages/ProfilePage";
import ReviewPage from "./pages/ReviewPage";
import SubtopicQuestionsPage from "./pages/SubtopicQuestionsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ContentManager from "./pages/admin/ContentManager";
import QuestionsManager from "./pages/admin/QuestionsManager";
import UsersManager from "./pages/admin/UsersManager";
import ReportsManager from "./pages/admin/ReportsManager";

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
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Main app routes — protected by Telegram Mini App auth */}
                <Route path="/" element={<TelegramAuthGate><ExamPage /></TelegramAuthGate>} />
                <Route path="/profile" element={<TelegramAuthGate><ProfilePage /></TelegramAuthGate>} />
                <Route path="/review" element={<TelegramAuthGate><ReviewPage /></TelegramAuthGate>} />
                <Route path="/subtopic" element={<TelegramAuthGate><SubtopicQuestionsPage /></TelegramAuthGate>} />
                <Route path="/subscription" element={<TelegramAuthGate><SubscriptionPage /></TelegramAuthGate>} />
                <Route path="/leaderboard" element={<TelegramAuthGate><LeaderboardPage /></TelegramAuthGate>} />
                
                {/* Admin routes — uses email/password auth, separate from Telegram */}
                <Route path="/admin" element={<AdminGuard><AdminLayout><AdminDashboard /></AdminLayout></AdminGuard>} />
                <Route path="/admin/content" element={<AdminGuard><AdminLayout><ContentManager /></AdminLayout></AdminGuard>} />
                <Route path="/admin/questions" element={<AdminGuard><AdminLayout><QuestionsManager /></AdminLayout></AdminGuard>} />
                <Route path="/admin/users" element={<AdminGuard><AdminLayout><UsersManager /></AdminLayout></AdminGuard>} />
                <Route path="/admin/reports" element={<AdminGuard><AdminLayout><ReportsManager /></AdminLayout></AdminGuard>} />
                
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
