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

interface Subtopic {
  id: string;
  title: string;
  topic_id: string;
  display_order: number;
  created_at: string;
  topics?: { title: string; subjects?: { title: string } };
}

interface Topic {
  id: string;
  title: string;
  subject_id: string;
  subjects?: { title: string };
}

export default function SubtopicsManager() {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubtopic, setEditingSubtopic] = useState<Subtopic | null>(null);
  const [formData, setFormData] = useState({ title: '', topic_id: '', display_order: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    const [subtopicsRes, topicsRes] = await Promise.all([
      supabase.from('subtopics').select('*, topics(title, subjects(title))').order('display_order'),
      supabase.from('topics').select('id, title, subject_id, subjects(title)').order('display_order'),
    ]);

    if (subtopicsRes.error) {
      toast.error('خطا در دریافت ساب‌تاپیک‌ها');
    } else {
      setSubtopics(subtopicsRes.data || []);
    }

    if (!topicsRes.error) {
      setTopics(topicsRes.data || []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateDialog = () => {
    setEditingSubtopic(null);
    setFormData({ title: '', topic_id: topics[0]?.id || '', display_order: subtopics.length });
    setIsDialogOpen(true);
  };

  const openEditDialog = (subtopic: Subtopic) => {
    setEditingSubtopic(subtopic);
    setFormData({ title: subtopic.title, topic_id: subtopic.topic_id, display_order: subtopic.display_order });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.topic_id) {
      toast.error('عنوان و تاپیک الزامی است');
      return;
    }

    setIsSaving(true);

    try {
      if (editingSubtopic) {
        const { error } = await supabase
          .from('subtopics')
          .update({ 
            title: formData.title, 
            topic_id: formData.topic_id,
            display_order: formData.display_order 
          })
          .eq('id', editingSubtopic.id);

        if (error) throw error;
        toast.success('ساب‌تاپیک با موفقیت ویرایش شد');
      } else {
        const { error } = await supabase
          .from('subtopics')
          .insert({ 
            title: formData.title, 
            topic_id: formData.topic_id,
            display_order: formData.display_order 
          });

        if (error) throw error;
        toast.success('ساب‌تاپیک با موفقیت اضافه شد');
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('خطا در ذخیره ساب‌تاپیک');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این ساب‌تاپیک اطمینان دارید؟')) return;

    const { error } = await supabase.from('subtopics').delete().eq('id', id);

    if (error) {
      toast.error('خطا در حذف ساب‌تاپیک');
      console.error(error);
    } else {
      toast.success('ساب‌تاپیک حذف شد');
      fetchData();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">مدیریت ساب‌تاپیک‌ها</h1>
        <Button onClick={openCreateDialog} className="gap-2" disabled={topics.length === 0}>
          <Plus className="h-4 w-4" />
          افزودن ساب‌تاپیک
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>لیست ساب‌تاپیک‌ها</CardTitle>
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
                  <TableHead>تاپیک</TableHead>
                  <TableHead>درس</TableHead>
                  <TableHead>تاریخ ایجاد</TableHead>
                  <TableHead className="w-[100px]">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subtopics.map((subtopic) => (
                  <TableRow key={subtopic.id}>
                    <TableCell>{subtopic.display_order}</TableCell>
                    <TableCell>{subtopic.title}</TableCell>
                    <TableCell>{subtopic.topics?.title}</TableCell>
                    <TableCell>{subtopic.topics?.subjects?.title}</TableCell>
                    <TableCell>{new Date(subtopic.created_at).toLocaleDateString('fa-IR')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(subtopic)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(subtopic.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {subtopics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      هیچ ساب‌تاپیکی یافت نشد
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
            <DialogTitle>{editingSubtopic ? 'ویرایش ساب‌تاپیک' : 'افزودن ساب‌تاپیک جدید'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="topic">تاپیک</Label>
              <Select
                value={formData.topic_id}
                onValueChange={(value) => setFormData({ ...formData, topic_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب تاپیک" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.subjects?.title} → {topic.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">عنوان ساب‌تاپیک</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: تعریف روانشناسی"
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
              {editingSubtopic ? 'ذخیره تغییرات' : 'افزودن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
