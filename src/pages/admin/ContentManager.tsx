import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Pencil, Trash2, Loader2, BookOpen, FolderTree, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Subject {
  id: string;
  title: string;
  display_order: number;
  created_at: string;
}

interface Topic {
  id: string;
  title: string;
  subject_id: string;
  display_order: number;
  created_at: string;
}

interface Subtopic {
  id: string;
  title: string;
  topic_id: string;
  display_order: number;
  created_at: string;
}

type EditType = 'subject' | 'topic' | 'subtopic';

interface EditData {
  type: EditType;
  id?: string;
  title: string;
  display_order: number;
  parent_id?: string;
}

export default function ContentManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editData, setEditData] = useState<EditData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    const [subjectsRes, topicsRes, subtopicsRes] = await Promise.all([
      supabase.from('subjects').select('*').order('display_order'),
      supabase.from('topics').select('*').order('display_order'),
      supabase.from('subtopics').select('*').order('display_order'),
    ]);

    if (!subjectsRes.error) setSubjects(subjectsRes.data || []);
    if (!topicsRes.error) setTopics(topicsRes.data || []);
    if (!subtopicsRes.error) setSubtopics(subtopicsRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const topicsBySubject = useMemo(() => {
    const map: Record<string, Topic[]> = {};
    topics.forEach(topic => {
      if (!map[topic.subject_id]) map[topic.subject_id] = [];
      map[topic.subject_id].push(topic);
    });
    return map;
  }, [topics]);

  const subtopicsByTopic = useMemo(() => {
    const map: Record<string, Subtopic[]> = {};
    subtopics.forEach(subtopic => {
      if (!map[subtopic.topic_id]) map[subtopic.topic_id] = [];
      map[subtopic.topic_id].push(subtopic);
    });
    return map;
  }, [subtopics]);

  const openCreateDialog = (type: EditType, parentId?: string) => {
    let order = 0;
    if (type === 'subject') order = subjects.length;
    else if (type === 'topic') order = (topicsBySubject[parentId!] || []).length;
    else if (type === 'subtopic') order = (subtopicsByTopic[parentId!] || []).length;

    setEditData({
      type,
      title: '',
      display_order: order,
      parent_id: parentId,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (type: EditType, item: Subject | Topic | Subtopic, parentId?: string) => {
    setEditData({
      type,
      id: item.id,
      title: item.title,
      display_order: item.display_order,
      parent_id: parentId,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editData || !editData.title.trim()) {
      toast.error('عنوان الزامی است');
      return;
    }

    setIsSaving(true);
    try {
      const { type, id, title, display_order, parent_id } = editData;

      if (type === 'subject') {
        if (id) {
          const { error } = await supabase.from('subjects').update({ title, display_order }).eq('id', id);
          if (error) throw error;
          toast.success('درس ویرایش شد');
        } else {
          const { error } = await supabase.from('subjects').insert({ title, display_order });
          if (error) throw error;
          toast.success('درس اضافه شد');
        }
      } else if (type === 'topic') {
        if (id) {
          const { error } = await supabase.from('topics').update({ title, display_order }).eq('id', id);
          if (error) throw error;
          toast.success('تاپیک ویرایش شد');
        } else {
          const { error } = await supabase.from('topics').insert({ title, display_order, subject_id: parent_id });
          if (error) throw error;
          toast.success('تاپیک اضافه شد');
        }
      } else if (type === 'subtopic') {
        if (id) {
          const { error } = await supabase.from('subtopics').update({ title, display_order }).eq('id', id);
          if (error) throw error;
          toast.success('ساب‌تاپیک ویرایش شد');
        } else {
          const { error } = await supabase.from('subtopics').insert({ title, display_order, topic_id: parent_id });
          if (error) throw error;
          toast.success('ساب‌تاپیک اضافه شد');
        }
      }

      setIsDialogOpen(false);
      setEditData(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('خطا در ذخیره');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (type: EditType, id: string) => {
    const typeLabels = { subject: 'درس', topic: 'تاپیک', subtopic: 'ساب‌تاپیک' };
    const cascadeWarnings: Record<EditType, string> = {
      subject: 'با حذف این درس، تمام تاپیک‌ها، ساب‌تاپیک‌ها و سوالات زیرمجموعه آن نیز حذف خواهند شد.',
      topic: 'با حذف این تاپیک، تمام ساب‌تاپیک‌ها و سوالات زیرمجموعه آن نیز حذف خواهند شد.',
      subtopic: 'با حذف این ساب‌تاپیک، تمام سوالات آن نیز حذف خواهند شد.',
    };
    if (!confirm(`${cascadeWarnings[type]}\n\nآیا از حذف این ${typeLabels[type]} اطمینان دارید؟`)) return;

    const table = type === 'subject' ? 'subjects' : type === 'topic' ? 'topics' : 'subtopics';
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
      toast.error('خطا در حذف');
      console.error(error);
    } else {
      toast.success(`${typeLabels[type]} حذف شد`);
      fetchData();
    }
  };

  const getDialogTitle = () => {
    if (!editData) return '';
    const labels = { subject: 'درس', topic: 'تاپیک', subtopic: 'ساب‌تاپیک' };
    return editData.id ? `ویرایش ${labels[editData.type]}` : `افزودن ${labels[editData.type]} جدید`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">مدیریت محتوا</h1>
        <Button onClick={() => openCreateDialog('subject')} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">افزودن درس</span>
          <span className="sm:hidden">درس</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ساختار درس‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">هیچ درسی یافت نشد</p>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {subjects.map(subject => (
                <AccordionItem 
                  key={subject.id} 
                  value={subject.id}
                  className="border border-border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-3 sm:py-4">
                    <div className="flex items-center justify-between w-full ml-2 sm:ml-4 gap-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <BookOpen className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold truncate text-sm sm:text-base">{subject.title}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                          {(topicsBySubject[subject.id] || []).length}
                        </span>
                      </div>
                      <div className="flex gap-0.5 sm:gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog('subject', subject)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete('subject', subject.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-1.5 sm:px-2 text-xs" onClick={() => openCreateDialog('topic', subject.id)}>
                          <Plus className="h-3 w-3 ml-0.5" />
                          <span className="hidden sm:inline">تاپیک</span>
                          <span className="sm:hidden">+</span>
                        </Button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    {(topicsBySubject[subject.id] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground pr-2 sm:pr-8">هیچ تاپیکی وجود ندارد</p>
                    ) : (
                      <Accordion type="multiple" className="pr-2 sm:pr-6 space-y-2">
                        {(topicsBySubject[subject.id] || []).map(topic => (
                          <AccordionItem 
                            key={topic.id} 
                            value={topic.id}
                            className="border border-border/50 rounded-lg px-4 bg-muted/30"
                          >
                            <AccordionTrigger className="hover:no-underline py-2.5 sm:py-3">
                              <div className="flex items-center justify-between w-full ml-2 sm:ml-4 gap-1">
                                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                                  <FolderTree className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate text-sm">{topic.title}</span>
                                  <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded shrink-0">
                                    {(subtopicsByTopic[topic.id] || []).length}
                                  </span>
                                </div>
                                <div className="flex gap-0.5 sm:gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditDialog('topic', topic, subject.id)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete('topic', topic.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 px-1 sm:px-1.5 text-xs" onClick={() => openCreateDialog('subtopic', topic.id)}>
                                    <Plus className="h-2.5 w-2.5 ml-0.5" />
                                    <span className="hidden sm:inline">ساب</span>
                                    <span className="sm:hidden">+</span>
                                  </Button>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-3">
                              {(subtopicsByTopic[topic.id] || []).length === 0 ? (
                                <p className="text-sm text-muted-foreground pr-2 sm:pr-6">هیچ ساب‌تاپیکی وجود ندارد</p>
                              ) : (
                                <div className="pr-2 sm:pr-6 space-y-1">
                                  {(subtopicsByTopic[topic.id] || []).map(subtopic => (
                                    <div 
                                      key={subtopic.id}
                                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 group"
                                    >
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{subtopic.title}</span>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-7 w-7"
                                          onClick={() => openEditDialog('subtopic', subtopic, topic.id)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-7 w-7 text-destructive hover:text-destructive"
                                          onClick={() => handleDelete('subtopic', subtopic.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان</Label>
              <Input
                id="title"
                value={editData?.title || ''}
                onChange={(e) => setEditData(prev => prev ? { ...prev, title: e.target.value } : null)}
                placeholder="عنوان را وارد کنید..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">ترتیب نمایش</Label>
              <Input
                id="order"
                type="number"
                value={editData?.display_order || 0}
                onChange={(e) => setEditData(prev => prev ? { ...prev, display_order: parseInt(e.target.value) || 0 } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              انصراف
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {editData?.id ? 'ذخیره تغییرات' : 'افزودن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
