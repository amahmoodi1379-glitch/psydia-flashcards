import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ANIMAL_AVATARS } from "@/lib/avatars";

interface AvatarSelectorProps {
  currentAvatar: string | null;
  onAvatarChange: (newAvatar: string) => void;
  children: React.ReactNode;
}

export function AvatarSelector({ currentAvatar, onAvatarChange, children }: AvatarSelectorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const currentIndex = currentAvatar ? parseInt(currentAvatar) : -1;

  const handleSelect = async (index: number) => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: index.toString() })
        .eq("id", user.id);

      if (error) throw error;

      onAvatarChange(index.toString());
      toast.success("آواتار با موفقیت تغییر کرد");
      setOpen(false);
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast.error("خطا در ذخیره آواتار");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-center">انتخاب آواتار</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-2 overflow-y-auto max-h-[50vh] p-1">
          {ANIMAL_AVATARS.map((animal, index) => (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={saving}
              className={cn(
                "w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all hover:scale-110",
                currentIndex === index
                  ? "bg-primary/20 ring-2 ring-primary"
                  : "bg-secondary hover:bg-secondary/80"
              )}
              title={animal.name}
            >
              {animal.emoji}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          روی آواتار مورد نظر کلیک کنید
        </p>
      </DialogContent>
    </Dialog>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { getAvatarEmoji } from "@/lib/avatars";
