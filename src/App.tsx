import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import ExamPage from "./pages/ExamPage";
import ProfilePage from "./pages/ProfilePage";
import ReviewPage from "./pages/ReviewPage";
import SubtopicQuestionsPage from "./pages/SubtopicQuestionsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LoginPage from "./pages/LoginPage";
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
                {/* Main app routes */}
                <Route path="/" element={<ExamPage />} />
                <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                <Route path="/review" element={<RequireAuth><ReviewPage /></RequireAuth>} />
                <Route path="/subtopic" element={<SubtopicQuestionsPage />} />
                <Route path="/subscription" element={<RequireAuth><SubscriptionPage /></RequireAuth>} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/login" element={<LoginPage />} />
                
                {/* Admin routes - no Telegram guard, uses email auth */}
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
