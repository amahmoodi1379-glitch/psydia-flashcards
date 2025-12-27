import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FolderTree, FileText, HelpCircle, Users } from 'lucide-react';

interface Stats {
  subjects: number;
  topics: number;
  subtopics: number;
  questions: number;
  users: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    subjects: 0,
    topics: 0,
    subtopics: 0,
    questions: 0,
    users: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [subjects, topics, subtopics, questions, users] = await Promise.all([
          supabase.from('subjects').select('id', { count: 'exact', head: true }),
          supabase.from('topics').select('id', { count: 'exact', head: true }),
          supabase.from('subtopics').select('id', { count: 'exact', head: true }),
          supabase.from('questions').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          subjects: subjects.count || 0,
          topics: topics.count || 0,
          subtopics: subtopics.count || 0,
          questions: questions.count || 0,
          users: users.count || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: 'درس‌ها', value: stats.subjects, icon: BookOpen, color: 'text-blue-500' },
    { title: 'تاپیک‌ها', value: stats.topics, icon: FolderTree, color: 'text-green-500' },
    { title: 'ساب‌تاپیک‌ها', value: stats.subtopics, icon: FileText, color: 'text-yellow-500' },
    { title: 'سوالات', value: stats.questions, icon: HelpCircle, color: 'text-purple-500' },
    { title: 'کاربران', value: stats.users, icon: Users, color: 'text-pink-500' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-8">داشبورد</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? '...' : stat.value.toLocaleString('fa-IR')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
