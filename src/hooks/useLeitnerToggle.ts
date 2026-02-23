import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ToggleLeitnerResult {
  is_in_leitner: boolean;
  box_number: number;
}

export function useLeitnerToggle() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (questionId: string): Promise<ToggleLeitnerResult> => {
      if (!user) throw new Error("احراز هویت انجام نشده است.");

      const { data, error } = await supabase.rpc("toggle_leitner", {
        _question_id: questionId,
      });

      if (error) throw error;

      const row = (data as unknown as ToggleLeitnerResult[])?.[0];
      if (!row) throw new Error("No result returned");

      return row;
    },
    onSuccess: (result) => {
      if (result.is_in_leitner) {
        toast.success("به لایتنر اضافه شد");
      } else {
        toast.success("از لایتنر حذف شد");
      }
      // Invalidate leitner-related queries
      queryClient.invalidateQueries({ queryKey: ["leitner-due-count"] });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "خطا در تغییر وضعیت لایتنر";
      toast.error(message);
    },
  });

  return {
    toggleLeitner: mutation.mutateAsync,
    isToggling: mutation.isPending,
  };
}
