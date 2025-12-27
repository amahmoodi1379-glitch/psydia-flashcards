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
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';
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
    correct_index: 0,
    explanation: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    const [questionsRes, subtopicsRes] = await Promise.all([
      supabase
        .from('questions')
        .select('*, subtopics(title, topics(title, subjects(title)))')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('subtopics').select('id, title, topics(title, subjects(title))').order('display_order'),
    ]);

    if (questionsRes.error) {
      toast.error('خطا در دریافت سوالات');
    } else {
      setQuestions(questionsRes.data || []);
    }

    if (!subtopicsRes.error) {
      setSubtopics(subtopicsRes.data || []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateDialog = () => {
    setEditingQuestion(null);
    setFormData({
      stem_text: '',
      subtopic_id: subtopics[0]?.id || '',
      choices: ['', '', '', ''],
      correct_index: 0,
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
      choices: [...choices, '', '', '', ''].slice(0, 4),
      correct_index: question.correct_index,
      explanation: question.explanation || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.stem_text.trim() || !formData.subtopic_id) {
      toast.error('متن سوال و ساب‌تاپیک الزامی است');
      return;
    }

    const validChoices = formData.choices.filter((c) => c.trim());
    if (validChoices.length < 2) {
      toast.error('حداقل دو گزینه الزامی است');
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
      } else {
        const { error } = await supabase.from('questions').insert(payload);

        if (error) throw error;
        toast.success('سوال با موفقیت اضافه شد');
      }

      setIsDialogOpen(false);
      fetchData();
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
      fetchData();
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
      fetchData();
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
          <CardTitle>لیست سوالات (آخرین ۱۰۰ مورد)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
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
              <Label htmlFor="subtopic">ساب‌تاپیک</Label>
              <Select
                value={formData.subtopic_id}
                onValueChange={(value) => setFormData({ ...formData, subtopic_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب ساب‌تاپیک" />
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
              <Label>گزینه‌ها (گزینه صحیح را انتخاب کنید)</Label>
              <RadioGroup
                value={formData.correct_index.toString()}
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
              انصراف
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {editingQuestion ? 'ذخیره تغییرات' : 'افزودن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
