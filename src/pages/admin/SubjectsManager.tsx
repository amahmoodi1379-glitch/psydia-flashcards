import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Subject {
  id: string;
  title: string;
  display_order: number;
  created_at: string;
}

export default function SubjectsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({ title: '', display_order: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('display_order');

    if (error) {
      toast.error('خطا در دریافت درس‌ها');
      console.error(error);
    } else {
      setSubjects(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const openCreateDialog = () => {
    setEditingSubject(null);
    setFormData({ title: '', display_order: subjects.length });
    setIsDialogOpen(true);
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({ title: subject.title, display_order: subject.display_order });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('عنوان درس الزامی است');
      return;
    }

    setIsSaving(true);

    try {
      if (editingSubject) {
        const { error } = await supabase
          .from('subjects')
          .update({ title: formData.title, display_order: formData.display_order })
          .eq('id', editingSubject.id);

        if (error) throw error;
        toast.success('درس با موفقیت ویرایش شد');
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert({ title: formData.title, display_order: formData.display_order });

        if (error) throw error;
        toast.success('درس با موفقیت اضافه شد');
      }

      setIsDialogOpen(false);
      fetchSubjects();
    } catch (error) {
      console.error(error);
      toast.error('خطا در ذخیره درس');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این درس اطمینان دارید؟')) return;

    const { error } = await supabase.from('subjects').delete().eq('id', id);

    if (error) {
      toast.error('خطا در حذف درس');
      console.error(error);
    } else {
      toast.success('درس حذف شد');
      fetchSubjects();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">مدیریت درس‌ها</h1>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          افزودن درس
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>لیست درس‌ها</CardTitle>
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
                  <TableHead>تاریخ ایجاد</TableHead>
                  <TableHead className="w-[100px]">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell>{subject.display_order}</TableCell>
                    <TableCell>{subject.title}</TableCell>
                    <TableCell>{new Date(subject.created_at).toLocaleDateString('fa-IR')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(subject)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(subject.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {subjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      هیچ درسی یافت نشد
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
            <DialogTitle>{editingSubject ? 'ویرایش درس' : 'افزودن درس جدید'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان درس</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: روانشناسی عمومی"
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
              {editingSubject ? 'ذخیره تغییرات' : 'افزودن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
