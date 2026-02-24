import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Search, ChevronRight, ChevronLeft, Upload, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  stem_text: string;
  choices: unknown;
  correct_index: number;
  explanation: string | null;
  subtopic_id: string;
  is_active: boolean;
  created_at: string;
  subtopics?: { title: string; topics?: { title: string; subjects?: { title: string } } };
}

interface Subtopic {
  id: string;
  title: string;
  topics?: { title: string; subjects?: { title: string } };
}

const ITEMS_PER_PAGE = 20;

export default function QuestionsManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    stem_text: '',
    subtopic_id: '',
    choices: ['', '', '', ''],
    correct_index: -1,
    explanation: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [lastUsedSubtopicId, setLastUsedSubtopicId] = useState('');

  // Bulk import state
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkSubtopicId, setBulkSubtopicId] = useState('');
  const [bulkJsonText, setBulkJsonText] = useState('');
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkIsImporting, setBulkIsImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ success: number; failed: number } | null>(null);
  const [schemaCopied, setSchemaCopied] = useState(false);

  const fetchQuestions = async (page: number, search: string) => {
    setIsLoading(true);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('questions')
      .select('*, subtopics(title, topics(title, subjects(title)))', { count: 'exact' });

    if (search.trim()) {
      query = query.ilike('stem_text', `%${search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      toast.error('خطا در دریافت سوالات');
    } else {
      setQuestions(data || []);
      setTotalCount(count || 0);
    }
    setIsLoading(false);
  };

  const fetchSubtopics = async () => {
    const { data, error } = await supabase
      .from('subtopics')
      .select('id, title, topics(title, subjects(title))')
      .order('display_order');

    if (!error) {
      setSubtopics(data || []);
    }
  };

  useEffect(() => {
    fetchSubtopics();
  }, []);

  useEffect(() => {
    fetchQuestions(currentPage, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchQuestions(1, searchQuery);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const openCreateDialog = () => {
    setEditingQuestion(null);
    setFormData({
      stem_text: '',
      subtopic_id: lastUsedSubtopicId,
      choices: ['', '', '', ''],
      correct_index: -1,
      explanation: '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (question: Question) => {
    setEditingQuestion(question);
    const choices = Array.isArray(question.choices) 
      ? question.choices 
      : ['', '', '', ''];
    setFormData({
      stem_text: question.stem_text,
      subtopic_id: question.subtopic_id,
      choices: [...choices, '', '', '', ''].slice(0, 4) as string[],
      correct_index: question.correct_index,
      explanation: question.explanation || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.subtopic_id) {
      toast.error('لطفاً ساب‌تاپیک را انتخاب کنید');
      return;
    }

    if (!formData.stem_text.trim()) {
      toast.error('متن سوال الزامی است');
      return;
    }

    const validChoices = formData.choices.filter((c) => c.trim());
    if (validChoices.length < 2) {
      toast.error('حداقل دو گزینه الزامی است');
      return;
    }

    if (formData.correct_index < 0 || formData.correct_index >= formData.choices.length) {
      toast.error('لطفاً گزینه صحیح را انتخاب کنید');
      return;
    }

    // Remap correct_index from original 4-choice array to filtered valid-choices array
    const selectedChoiceText = formData.choices[formData.correct_index];
    if (!selectedChoiceText?.trim()) {
      toast.error('گزینه صحیح انتخاب‌شده خالی است');
      return;
    }
    const remappedCorrectIndex = validChoices.indexOf(selectedChoiceText);
    if (remappedCorrectIndex < 0) {
      toast.error('خطا در تطبیق گزینه صحیح');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        stem_text: formData.stem_text,
        subtopic_id: formData.subtopic_id,
        choices: validChoices,
        correct_index: remappedCorrectIndex,
        explanation: formData.explanation || null,
      };

      if (editingQuestion) {
        const { error } = await supabase
          .from('questions')
          .update(payload)
          .eq('id', editingQuestion.id);

        if (error) throw error;
        toast.success('سوال با موفقیت ویرایش شد');
        setIsDialogOpen(false);
      } else {
        const { error } = await supabase.from('questions').insert(payload);

        if (error) throw error;
        toast.success('سوال با موفقیت اضافه شد');
        
        // Keep dialog open, reset only question-specific fields
        setLastUsedSubtopicId(formData.subtopic_id);
        setFormData(prev => ({
          ...prev,
          stem_text: '',
          choices: ['', '', '', ''],
          correct_index: -1,
          explanation: '',
        }));
      }

      fetchQuestions(currentPage, searchQuery);
    } catch (error) {
      console.error(error);
      toast.error('خطا در ذخیره سوال');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این سوال اطمینان دارید؟')) return;

    const { error } = await supabase.from('questions').delete().eq('id', id);

    if (error) {
      toast.error('خطا در حذف سوال');
      console.error(error);
    } else {
      toast.success('سوال حذف شد');
      fetchQuestions(currentPage, searchQuery);
    }
  };

  // --- Bulk Import Logic ---
  const BULK_JSON_SCHEMA = `[
  {
    "stem_text": "متن سوال",
    "choices": ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
    "correct_index": 0,
    "explanation": "توضیح پاسخ (اختیاری، می‌تواند null باشد)"
  }
]`;

  const BULK_SCHEMA_DESCRIPTION = `فیلدهای هر سوال:
• stem_text (string, الزامی): متن سوال
• choices (string[], الزامی): آرایه گزینه‌ها (حداقل ۲، حداکثر ۶)
• correct_index (number, الزامی): ایندکس گزینه صحیح (از ۰ شروع می‌شود)
• explanation (string | null, اختیاری): توضیح پاسخ صحیح`;

  interface BulkQuestionItem {
    stem_text: string;
    choices: string[];
    correct_index: number;
    explanation?: string | null;
  }

  const validateBulkJson = (text: string): { items: BulkQuestionItem[]; errors: string[] } => {
    const errors: string[] = [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { items: [], errors: [`خطای JSON: ${e instanceof Error ? e.message : 'فرمت نامعتبر'}`] };
    }

    if (!Array.isArray(parsed)) {
      return { items: [], errors: ['ورودی باید یک آرایه JSON باشد (با [ شروع و با ] پایان یابد)'] };
    }

    if (parsed.length === 0) {
      return { items: [], errors: ['آرایه خالی است — حداقل یک سوال وارد کنید'] };
    }

    const validItems: BulkQuestionItem[] = [];

    parsed.forEach((item: unknown, index: number) => {
      const prefix = `سوال ${index + 1}`;
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        errors.push(`${prefix}: باید یک آبجکت باشد`);
        return;
      }

      const q = item as Record<string, unknown>;

      // stem_text
      if (typeof q.stem_text !== 'string' || !q.stem_text.trim()) {
        errors.push(`${prefix}: فیلد stem_text الزامی و باید رشته غیرخالی باشد`);
        return;
      }

      // choices
      if (!Array.isArray(q.choices)) {
        errors.push(`${prefix}: فیلد choices باید آرایه باشد`);
        return;
      }
      const validChoices = q.choices.filter((c: unknown) => typeof c === 'string' && c.trim());
      if (validChoices.length < 2) {
        errors.push(`${prefix}: حداقل ۲ گزینه غیرخالی الزامی است (${validChoices.length} گزینه معتبر)`);
        return;
      }
      if (validChoices.length > 6) {
        errors.push(`${prefix}: حداکثر ۶ گزینه مجاز است`);
        return;
      }

      // correct_index
      if (typeof q.correct_index !== 'number' || !Number.isInteger(q.correct_index)) {
        errors.push(`${prefix}: فیلد correct_index باید عدد صحیح باشد`);
        return;
      }
      if (q.correct_index < 0 || q.correct_index >= validChoices.length) {
        errors.push(`${prefix}: correct_index (${q.correct_index}) خارج از محدوده گزینه‌ها (۰ تا ${validChoices.length - 1})`);
        return;
      }

      // explanation
      const explanation = q.explanation === undefined || q.explanation === null
        ? null
        : typeof q.explanation === 'string'
          ? q.explanation
          : null;

      validItems.push({
        stem_text: q.stem_text.trim(),
        choices: validChoices as string[],
        correct_index: q.correct_index,
        explanation,
      });
    });

    return { items: validItems, errors };
  };

  const handleBulkImport = async () => {
    if (!bulkSubtopicId) {
      setBulkErrors(['لطفاً ابتدا ساب‌تاپیک را انتخاب کنید']);
      return;
    }

    const { items, errors } = validateBulkJson(bulkJsonText);
    setBulkErrors(errors);

    if (items.length === 0) {
      if (errors.length === 0) setBulkErrors(['هیچ سوال معتبری یافت نشد']);
      return;
    }

    setBulkIsImporting(true);
    setBulkResult(null);

    try {
      const payload = items.map((item) => ({
        stem_text: item.stem_text,
        choices: item.choices,
        correct_index: item.correct_index,
        explanation: item.explanation || null,
        subtopic_id: bulkSubtopicId,
      }));

      const { error } = await supabase.from('questions').insert(payload);

      if (error) throw error;

      const successCount = items.length;
      const failedCount = errors.length;
      setBulkResult({ success: successCount, failed: failedCount });
      toast.success(`${successCount} سوال با موفقیت وارد شد`);

      // Clear textarea after success
      setBulkJsonText('');
      fetchQuestions(currentPage, searchQuery);
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error('خطا در وارد کردن سوالات');
      setBulkErrors((prev) => [...prev, `خطای سرور: ${error instanceof Error ? error.message : 'ناشناخته'}`]);
    } finally {
      setBulkIsImporting(false);
    }
  };

  const handleCopySchema = async () => {
    try {
      await navigator.clipboard.writeText(BULK_JSON_SCHEMA);
      setSchemaCopied(true);
      setTimeout(() => setSchemaCopied(false), 2000);
      toast.success('اسکیما کپی شد');
    } catch {
      toast.error('خطا در کپی');
    }
  };

  const openBulkDialog = () => {
    setBulkSubtopicId(lastUsedSubtopicId);
    setBulkJsonText('');
    setBulkErrors([]);
    setBulkResult(null);
    setIsBulkDialogOpen(true);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('questions')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('خطا در تغییر وضعیت');
    } else {
      toast.success(currentStatus ? 'سوال غیرفعال شد' : 'سوال فعال شد');
      fetchQuestions(currentPage, searchQuery);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">مدیریت سوالات</h1>
        <div className="flex items-center gap-2">
          <Button onClick={openBulkDialog} variant="outline" className="gap-2 flex-1 sm:flex-none" disabled={subtopics.length === 0}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">وارد دسته‌جمعی</span>
            <span className="sm:hidden">وارد</span>
          </Button>
          <Button onClick={openCreateDialog} className="gap-2 flex-1 sm:flex-none" disabled={subtopics.length === 0}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">افزودن سوال</span>
            <span className="sm:hidden">سوال</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base md:text-lg">
              لیست سوالات ({totalCount.toLocaleString('fa-IR')} مورد)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="جستجو در متن سوال..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 sm:w-56"
              />
              <Button variant="outline" size="icon" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>متن سوال</TableHead>
                      <TableHead>ساب‌تاپیک</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead className="w-[120px]">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell className="max-w-xs truncate">{question.stem_text}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {question.subtopics?.topics?.subjects?.title} → {question.subtopics?.topics?.title} → {question.subtopics?.title}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${question.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            {question.is_active ? 'فعال' : 'غیرفعال'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleActive(question.id, question.is_active)}
                              title={question.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                            >
                              {question.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(question)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(question.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {questions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          هیچ سوالی یافت نشد
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden space-y-2">
                {questions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">هیچ سوالی یافت نشد</p>
                ) : (
                  questions.map((question) => (
                    <div
                      key={question.id}
                      className="bg-card border border-border rounded-xl p-3 flex items-start justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium line-clamp-2">{question.stem_text}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {question.subtopics?.topics?.subjects?.title} » {question.subtopics?.topics?.title} » {question.subtopics?.title}
                        </p>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${question.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                          {question.is_active ? 'فعال' : 'غیرفعال'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleActive(question.id, question.is_active)}
                        >
                          {question.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(question)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(question.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                    قبلی
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentPage.toLocaleString('fa-IR')} / {totalPages.toLocaleString('fa-IR')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    بعدی
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent dir="rtl" className="w-full max-w-2xl max-h-[92vh] overflow-y-auto mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'ویرایش سوال' : 'افزودن سوال جدید'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subtopic">
                ساب‌تاپیک <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.subtopic_id}
                onValueChange={(value) => setFormData({ ...formData, subtopic_id: value })}
              >
                <SelectTrigger className={!formData.subtopic_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="انتخاب ساب‌تاپیک (الزامی)" />
                </SelectTrigger>
                <SelectContent>
                  {subtopics.map((subtopic) => (
                    <SelectItem key={subtopic.id} value={subtopic.id}>
                      {subtopic.topics?.subjects?.title} → {subtopic.topics?.title} → {subtopic.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stem">متن سوال</Label>
              <Textarea
                id="stem"
                value={formData.stem_text}
                onChange={(e) => setFormData({ ...formData, stem_text: e.target.value })}
                placeholder="متن سوال را وارد کنید..."
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>
                گزینه‌ها <span className="text-destructive">*</span>
                <span className="text-sm text-muted-foreground mr-2">(گزینه صحیح را انتخاب کنید)</span>
              </Label>
              <RadioGroup
                value={formData.correct_index >= 0 ? formData.correct_index.toString() : ''}
                onValueChange={(value) => setFormData({ ...formData, correct_index: parseInt(value) })}
              >
                {formData.choices.map((choice, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <RadioGroupItem value={index.toString()} id={`choice-${index}`} />
                    <Input
                      value={choice}
                      onChange={(e) => {
                        const newChoices = [...formData.choices];
                        newChoices[index] = e.target.value;
                        setFormData({ ...formData, choices: newChoices });
                      }}
                      placeholder={`گزینه ${index + 1}`}
                      className="flex-1"
                    />
                  </div>
                ))}
              </RadioGroup>
              {formData.correct_index < 0 && (
                <p className="text-sm text-destructive">گزینه صحیح انتخاب نشده است</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="explanation">توضیح پاسخ (اختیاری)</Label>
              <Textarea
                id="explanation"
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="توضیح پاسخ صحیح..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              بستن
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {editingQuestion ? 'ذخیره تغییرات' : 'افزودن سوال'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Bulk Import Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent dir="rtl" className="w-full max-w-3xl max-h-[92vh] overflow-y-auto mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              وارد کردن دسته‌جمعی سوالات (JSON)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Subtopic Selector */}
            <div className="space-y-2">
              <Label>
                ساب‌تاپیک مقصد <span className="text-destructive">*</span>
              </Label>
              <Select
                value={bulkSubtopicId}
                onValueChange={(value) => setBulkSubtopicId(value)}
              >
                <SelectTrigger className={!bulkSubtopicId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="انتخاب ساب‌تاپیک (همه سوالات به این ساب‌تاپیک اضافه می‌شوند)" />
                </SelectTrigger>
                <SelectContent>
                  {subtopics.map((subtopic) => (
                    <SelectItem key={subtopic.id} value={subtopic.id}>
                      {subtopic.topics?.subjects?.title} → {subtopic.topics?.title} → {subtopic.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* JSON Schema Display */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">اسکیمای JSON مجاز</Label>
                <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs" onClick={handleCopySchema}>
                  {schemaCopied ? (
                    <><CheckCircle2 className="h-3 w-3 text-success" /> کپی شد</>
                  ) : (
                    <><Copy className="h-3 w-3" /> کپی اسکیما</>
                  )}
                </Button>
              </div>
              <pre className="bg-muted/50 border border-border rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre" dir="ltr">
                {BULK_JSON_SCHEMA}
              </pre>
              <p className="text-xs text-muted-foreground whitespace-pre-line">{BULK_SCHEMA_DESCRIPTION}</p>
            </div>

            {/* JSON Input */}
            <div className="space-y-2">
              <Label>ورودی JSON</Label>
              <Textarea
                value={bulkJsonText}
                onChange={(e) => {
                  setBulkJsonText(e.target.value);
                  setBulkErrors([]);
                  setBulkResult(null);
                }}
                placeholder={`[\n  {\n    "stem_text": "...",\n    "choices": ["...", "...", "...", "..."],\n    "correct_index": 0,\n    "explanation": null\n  }\n]`}
                rows={12}
                className="font-mono text-sm"
                dir="ltr"
              />
            </div>

            {/* Validation Errors */}
            {bulkErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    {bulkErrors.length} خطا یافت شد
                  </span>
                </div>
                <ul className="space-y-1">
                  {bulkErrors.map((err, i) => (
                    <li key={i} className="text-xs text-destructive">
                      • {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success Result */}
            {bulkResult && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm text-success font-medium">
                  {bulkResult.success} سوال با موفقیت وارد شد
                  {bulkResult.failed > 0 && ` (${bulkResult.failed} خطا)`}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
              بستن
            </Button>
            <Button
              onClick={handleBulkImport}
              disabled={bulkIsImporting || !bulkJsonText.trim() || !bulkSubtopicId}
              className="gap-2"
            >
              {bulkIsImporting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Upload className="h-4 w-4" />
              وارد کردن سوالات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
