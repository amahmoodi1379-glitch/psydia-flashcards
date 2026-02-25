import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Flag } from 'lucide-react';

interface ReportReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
  isSubmitting: boolean;
}

export function ReportReasonDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: ReportReasonDialogProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onSubmit(reason.trim());
    setReason('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            گزارش سوال
          </DialogTitle>
          <DialogDescription>
            لطفاً دلیل گزارش خود را بنویسید.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="report-reason">دلیل گزارش</Label>
            <Textarea
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثلاً: پاسخ صحیح اشتباه است، متن سوال ناقص است..."
              rows={3}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            انصراف
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || isSubmitting}
            variant="destructive"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            ارسال گزارش
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
