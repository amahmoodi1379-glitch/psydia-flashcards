import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Eye, Flag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Report {
  id: string;
  user_id: string;
  question_id: string;
  reason: string;
  created_at: string;
  profiles?: { display_name: string | null };
  questions?: { stem_text: string; choices: unknown; correct_index: number; explanation: string | null };
}

export default function ReportsManager() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('question_reports')
      .select('*, profiles(display_name), questions(stem_text, choices, correct_index, explanation)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('خطا در دریافت گزارشات');
      console.error(error);
    } else {
      setReports(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDelete = async (reportId: string) => {
    setIsDeleting(reportId);
    const { error } = await supabase
      .from('question_reports')
      .delete()
      .eq('id', reportId);

    if (error) {
      toast.error('خطا در حذف گزارش');
    } else {
      toast.success('گزارش حذف شد');
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (selectedReport?.id === reportId) setSelectedReport(null);
    }
    setIsDeleting(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' });

  const getChoicesArray = (choices: unknown): string[] => {
    if (Array.isArray(choices)) return choices as string[];
    try {
      const parsed = typeof choices === 'string' ? JSON.parse(choices) : choices;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Flag className="h-7 w-7 text-destructive" />
          <h1 className="text-3xl font-bold text-foreground">گزارشات سوالات</h1>
        </div>
        <Badge variant="secondary" className="text-sm">
          {reports.length} گزارش
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">هیچ گزارشی ثبت نشده است</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">لیست گزارشات</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>کاربر</TableHead>
                  <TableHead>سوال (خلاصه)</TableHead>
                  <TableHead>دلیل</TableHead>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.profiles?.display_name || 'ناشناس'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {report.questions?.stem_text || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.reason || 'other'}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(report.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedReport(report)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(report.id)}
                          disabled={isDeleting === report.id}
                        >
                          {isDeleting === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Question Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>جزئیات سوال گزارش شده</DialogTitle>
          </DialogHeader>
          {selectedReport?.questions && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">متن سوال</p>
                <p className="text-foreground">{selectedReport.questions.stem_text}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">گزینه‌ها</p>
                <div className="space-y-2">
                  {getChoicesArray(selectedReport.questions.choices).map((choice, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg border text-sm ${
                        i === selectedReport.questions!.correct_index
                          ? 'border-success bg-success/10 text-success'
                          : 'border-border'
                      }`}
                    >
                      {i === selectedReport.questions!.correct_index && '✓ '}
                      {choice}
                    </div>
                  ))}
                </div>
              </div>
              {selectedReport.questions.explanation && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">توضیح</p>
                  <p className="text-sm text-foreground bg-secondary/50 p-3 rounded-lg">
                    {selectedReport.questions.explanation}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">
                    گزارش‌دهنده: {selectedReport.profiles?.display_name || 'ناشناس'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    دلیل: {selectedReport.reason || 'other'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(selectedReport.id)}
                  disabled={isDeleting === selectedReport.id}
                >
                  {isDeleting === selectedReport.id ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 ml-2" />
                  )}
                  حذف گزارش
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
