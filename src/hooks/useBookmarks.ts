import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useBookmarks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bookmarkedIds = new Set<string>(), isLoading } = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: async (): Promise<Set<string>> => {
      if (!user) return new Set();

      const { data, error } = await supabase
        .from("bookmarks")
        .select("question_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching bookmarks:", error);
        return new Set();
      }

      return new Set(data.map((b) => b.question_id));
    },
    enabled: !!user,
  });

  const addBookmark = useMutation({
    mutationFn: async (questionId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("bookmarks").insert({
        user_id: user.id,
        question_id: questionId,
      });

      if (error) throw error;
    },
    onSuccess: (_, questionId) => {
      queryClient.setQueryData<Set<string>>(["bookmarks", user?.id], (old) => {
        const next = new Set(old);
        next.add(questionId);
        return next;
      });
      toast.success("به نشان‌شده‌ها اضافه شد");
    },
    onError: () => {
      toast.error("خطا در ذخیره نشان");
    },
  });

  const removeBookmark = useMutation({
    mutationFn: async (questionId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("question_id", questionId);

      if (error) throw error;
    },
    onSuccess: (_, questionId) => {
      queryClient.setQueryData<Set<string>>(["bookmarks", user?.id], (old) => {
        const next = new Set(old);
        next.delete(questionId);
        return next;
      });
      toast.success("از نشان‌شده‌ها حذف شد");
    },
    onError: () => {
      toast.error("خطا در حذف نشان");
    },
  });

  const toggleBookmark = (questionId: string) => {
    if (bookmarkedIds.has(questionId)) {
      removeBookmark.mutate(questionId);
    } else {
      addBookmark.mutate(questionId);
    }
  };

  const isBookmarked = (questionId: string) => bookmarkedIds.has(questionId);

  return {
    bookmarkedIds,
    isLoading,
    toggleBookmark,
    isBookmarked,
    bookmarkCount: bookmarkedIds.size,
  };
}
