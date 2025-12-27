import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Topic {
  id: string;
  title: string;
  subject_id: string;
  display_order: number;
  created_at: string;
  subjects?: { title: string };
}

interface Subject {
  id: string;
  title: string;
}

export default function TopicsManager() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [formData, setFormData] = useState({ title: '', subject_id: '', display_order: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    const [topicsRes, subjectsRes] = await Promise.all([
      supabase.from('topics').select('*, subjects(title)').order('display_order'),
      supabase.from('subjects').select('id, title').order('display_order'),
    ]);

    if (topicsRes.error) {
      toast.error('خطا در دریافت تاپیک‌ها');
    } else {
      setTopics(topicsRes.data || []);
    }

    if (!subjectsRes.error) {
      setSubjects(subjectsRes.data || []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateDialog = () => {
    setEditingTopic(null);
    setFormData({ title: '', subject_id: subjects[0]?.id || '', display_order: topics.length });
    setIsDialogOpen(true);
  };

  const openEditDialog = (topic: Topic) => {
    setEditingTopic(topic);
    setFormData({ title: topic.title, subject_id: topic.subject_id, display_order: topic.display_order });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.subject_id) {
      toast.error('عنوان و درس الزامی است');
      return;
    }

    setIsSaving(true);

    try {
      if (editingTopic) {
        const { error } = await supabase
          .from('topics')
          .update({ 
            title: formData.title, 
            subject_id: formData.subject_id,
            display_order: formData.display_order 
          })
          .eq('id', editingTopic.id);

        if (error) throw error;
        toast.success('تاپیک با موفقیت ویرایش شد');
      } else {
        const { error } = await supabase
          .from('topics')
          .insert({ 
            title: formData.title, 
            subject_id: formData.subject_id,
            display_order: formData.display_order 
          });

        if (error) throw error;
        toast.success('تاپیک با موفقیت اضافه شد');
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('خطا در ذخیره تاپیک');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این تاپیک اطمینان دارید؟')) return;

    const { error } = await supabase.from('topics').delete().eq('id', id);

    if (error) {
      toast.error('خطا در حذف تاپیک');
      console.error(error);
    } else {
      toast.success('تاپیک حذف شد');
      fetchData();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">مدیریت تاپیک‌ها</h1>
        <Button onClick={openCreateDialog} className="gap-2" disabled={subjects.length === 0}>
          <Plus className="h-4 w-4" />
          افزودن تاپیک
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>لیست تاپیک‌ها</CardTitle>
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
                  <TableHead>ترتیب</TableHead>
                  <TableHead>عنوان</TableHead>
                  <TableHead>درس</TableHead>
                  <TableHead>تاریخ ایجاد</TableHead>
                  <TableHead className="w-[100px]">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map((topic) => (
                  <TableRow key={topic.id}>
                    <TableCell>{topic.display_order}</TableCell>
                    <TableCell>{topic.title}</TableCell>
                    <TableCell>{topic.subjects?.title}</TableCell>
                    <TableCell>{new Date(topic.created_at).toLocaleDateString('fa-IR')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(topic)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(topic.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {topics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      هیچ تاپیکی یافت نشد
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingTopic ? 'ویرایش تاپیک' : 'افزودن تاپیک جدید'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">درس</Label>
              <Select
                value={formData.subject_id}
                onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب درس" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">عنوان تاپیک</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: مقدمه و تاریخچه"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">ترتیب نمایش</Label>
              <Input
                id="order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              انصراف
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {editingTopic ? 'ذخیره تغییرات' : 'افزودن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
