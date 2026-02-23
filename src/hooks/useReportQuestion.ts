import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useReportQuestion() {
  const { user } = useAuth();

  const reportMutation = useMutation({
    mutationFn: async ({ questionId, reason }: { questionId: string; reason?: string }) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("question_reports").insert({
        user_id: user.id,
        question_id: questionId,
        reason: reason || "other",
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("duplicate");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("گزارش شما ثبت شد. با تشکر از همکاری شما.");
    },
    onError: (error: Error) => {
      if (error.message === "duplicate") {
        toast.info("شما قبلاً این سوال را گزارش کرده‌اید");
      } else {
        toast.error("خطا در ارسال گزارش. لطفاً دوباره تلاش کنید.");
      }
    },
  });

  return {
    reportQuestion: (questionId: string, reason?: string) =>
      reportMutation.mutate({ questionId, reason }),
    isReporting: reportMutation.isPending,
  };
}
