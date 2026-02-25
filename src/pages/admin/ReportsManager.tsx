import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Trash2, Eye, Flag, Pencil, Save } from 'lucide-react';
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

interface EditQuestionForm {
  stem_text: string;
  choices: string[];
  correct_index: number;
  explanation: string;
}

export default function ReportsManager() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditQuestionForm | null>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

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

  const startEditing = (report: Report) => {
    if (!report.questions) return;
    const choices = getChoicesArray(report.questions.choices);
    setEditForm({
      stem_text: report.questions.stem_text,
      choices: [...choices, '', '', '', ''].slice(0, 4),
      correct_index: report.questions.correct_index,
      explanation: report.questions.explanation || '',
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  const handleSaveQuestion = async () => {
    if (!selectedReport || !editForm) return;

    if (!editForm.stem_text.trim()) {
      toast.error('متن سوال الزامی است');
      return;
    }

    const validChoices = editForm.choices.filter((c) => c.trim());
    if (validChoices.length < 2) {
      toast.error('حداقل دو گزینه الزامی است');
      return;
    }

    if (editForm.correct_index < 0 || editForm.correct_index >= editForm.choices.length) {
      toast.error('لطفاً گزینه صحیح را انتخاب کنید');
      return;
    }

    const selectedChoiceText = editForm.choices[editForm.correct_index];
    if (!selectedChoiceText?.trim()) {
      toast.error('گزینه صحیح انتخاب‌شده خالی است');
      return;
    }
    const remappedCorrectIndex = validChoices.indexOf(selectedChoiceText);

    setIsSavingQuestion(true);
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          stem_text: editForm.stem_text,
          choices: validChoices,
          correct_index: remappedCorrectIndex,
          explanation: editForm.explanation || null,
        })
        .eq('id', selectedReport.question_id);

      if (error) throw error;

      toast.success('سوال با موفقیت ویرایش شد');
      setIsEditing(false);
      setEditForm(null);
      fetchReports();
    } catch (error) {
      console.error(error);
      toast.error('خطا در ذخیره سوال');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 md:h-7 md:w-7 text-destructive shrink-0" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">گزارشات سوالات</h1>
        </div>
        <Badge variant="secondary" className="text-sm shrink-0">
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
            <p className="text-muted-foreground">هیچ گزارشی ثبت نشده است</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">لیست گزارشات</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">

            {/* Desktop Table */}
            <div className="hidden md:block">
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
                          <Button size="sm" variant="ghost" onClick={() => setSelectedReport(report)}>
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
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-2">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-card border border-border rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">
                          {report.profiles?.display_name || 'ناشناس'}
                        </span>
                        <Badge variant="outline" className="text-xs py-0 h-5">
                          {report.reason || 'other'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {report.questions?.stem_text || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(report.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => setSelectedReport(report)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(report.id)}
                        disabled={isDeleting === report.id}
                      >
                        {isDeleting === report.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </CardContent>
        </Card>
      )}

      {/* Question Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => { if (!open) { setSelectedReport(null); cancelEditing(); } }}>
        <DialogContent className="w-full max-w-2xl max-h-[92vh] overflow-y-auto mx-2 sm:mx-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'ویرایش سوال گزارش شده' : 'جزئیات سوال گزارش شده'}</DialogTitle>
          </DialogHeader>
          {selectedReport?.questions && !isEditing && (
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
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditing(selectedReport)}
                  >
                    <Pencil className="h-4 w-4 ml-2" />
                    ویرایش سوال
                  </Button>
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
            </div>
          )}
          {selectedReport?.questions && isEditing && editForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-stem">متن سوال</Label>
                <Textarea
                  id="edit-stem"
                  value={editForm.stem_text}
                  onChange={(e) => setEditForm({ ...editForm, stem_text: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label>
                  گزینه‌ها <span className="text-destructive">*</span>
                  <span className="text-sm text-muted-foreground mr-2">(گزینه صحیح را انتخاب کنید)</span>
                </Label>
                <RadioGroup
                  value={editForm.correct_index >= 0 ? editForm.correct_index.toString() : ''}
                  onValueChange={(value) => setEditForm({ ...editForm, correct_index: parseInt(value) })}
                >
                  {editForm.choices.map((choice, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <RadioGroupItem value={index.toString()} id={`edit-choice-${index}`} />
                      <Input
                        value={choice}
                        onChange={(e) => {
                          const newChoices = [...editForm.choices];
                          newChoices[index] = e.target.value;
                          setEditForm({ ...editForm, choices: newChoices });
                        }}
                        placeholder={`گزینه ${index + 1}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-explanation">توضیح پاسخ (اختیاری)</Label>
                <Textarea
                  id="edit-explanation"
                  value={editForm.explanation}
                  onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-2 text-xs text-muted-foreground">
                <p>گزارش‌دهنده: {selectedReport.profiles?.display_name || 'ناشناس'}</p>
                <p>دلیل: {selectedReport.reason || 'other'}</p>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button size="sm" variant="outline" onClick={cancelEditing}>
                  انصراف
                </Button>
                <Button size="sm" onClick={handleSaveQuestion} disabled={isSavingQuestion}>
                  {isSavingQuestion && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  <Save className="h-4 w-4 ml-2" />
                  ذخیره تغییرات
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
