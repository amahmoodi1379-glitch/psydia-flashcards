import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TelegramGuard } from "@/components/TelegramGuard";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import ProfilePage from "./pages/ProfilePage";
import ReviewPage from "./pages/ReviewPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SubjectsManager from "./pages/admin/SubjectsManager";
import TopicsManager from "./pages/admin/TopicsManager";
import SubtopicsManager from "./pages/admin/SubtopicsManager";
import QuestionsManager from "./pages/admin/QuestionsManager";
import UsersManager from "./pages/admin/UsersManager";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
            
            {/* Auth - accessible outside Telegram */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Admin routes - no Telegram guard */}
            <Route path="/admin" element={<AdminGuard><AdminLayout><AdminDashboard /></AdminLayout></AdminGuard>} />
            <Route path="/admin/subjects" element={<AdminGuard><AdminLayout><SubjectsManager /></AdminLayout></AdminGuard>} />
            <Route path="/admin/topics" element={<AdminGuard><AdminLayout><TopicsManager /></AdminLayout></AdminGuard>} />
            <Route path="/admin/subtopics" element={<AdminGuard><AdminLayout><SubtopicsManager /></AdminLayout></AdminGuard>} />
            <Route path="/admin/questions" element={<AdminGuard><AdminLayout><QuestionsManager /></AdminLayout></AdminGuard>} />
            <Route path="/admin/users" element={<AdminGuard><AdminLayout><UsersManager /></AdminLayout></AdminGuard>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
