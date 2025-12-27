import { useEffect, useState, useMemo } from 'react';
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
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Search, ChevronRight, ChevronLeft } from 'lucide-react';
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

    if (formData.correct_index < 0 || formData.correct_index >= validChoices.length) {
      toast.error('لطفاً گزینه صحیح را انتخاب کنید');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        stem_text: formData.stem_text,
        subtopic_id: formData.subtopic_id,
        choices: validChoices,
        correct_index: formData.correct_index,
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">مدیریت سوالات</h1>
        <Button onClick={openCreateDialog} className="gap-2" disabled={subtopics.length === 0}>
          <Plus className="h-4 w-4" />
          افزودن سوال
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>لیست سوالات ({totalCount.toLocaleString('fa-IR')} مورد)</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="جستجو در متن سوال..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-64"
              />
              <Button variant="outline" size="icon" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                    قبلی
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">
                    صفحه {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
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
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
    </div>
  );
}
