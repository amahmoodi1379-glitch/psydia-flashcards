import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FolderTree, FileText, HardDrive, HelpCircle, Users } from 'lucide-react';

interface Stats {
  subjects: number;
  topics: number;
  subtopics: number;
  questions: number;
  users: number;
}

interface TableStorageStat {
  table_name: string;
  row_estimate: number;
  total_size_pretty: string;
  total_size_bytes: number;
  table_size_pretty: string;
  index_size_pretty: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    subjects: 0,
    topics: 0,
    subtopics: 0,
    questions: 0,
    users: 0,
  });
  const [storageStats, setStorageStats] = useState<TableStorageStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [subjects, topics, subtopics, questions, users, tableStorage] = await Promise.all([
          supabase.from('subjects').select('id', { count: 'exact', head: true }),
          supabase.from('topics').select('id', { count: 'exact', head: true }),
          supabase.from('subtopics').select('id', { count: 'exact', head: true }),
          supabase.from('questions').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.rpc('get_table_storage_report'),
        ]);

        setStats({
          subjects: subjects.count || 0,
          topics: topics.count || 0,
          subtopics: subtopics.count || 0,
          questions: questions.count || 0,
          users: users.count || 0,
        });

        if (tableStorage.error) {
          console.error('Error fetching table storage stats:', tableStorage.error);
        } else {
          setStorageStats((tableStorage.data as TableStorageStat[] | null) || []);
        }
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

      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">پایش حجم جداول کلیدی</CardTitle>
          <HardDrive className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">در حال بارگذاری...</div>
          ) : storageStats.length === 0 ? (
            <div className="text-muted-foreground">داده‌ای برای نمایش وجود ندارد.</div>
          ) : (
            <div className="space-y-3">
              {storageStats.map((item) => (
                <div key={item.table_name} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                  <div>
                    <div className="font-medium">{item.table_name}</div>
                    <div className="text-xs text-muted-foreground">
                      ردیف تخمینی: {item.row_estimate.toLocaleString('fa-IR')}
                    </div>
                  </div>
                  <div className="text-sm text-left" dir="ltr">
                    <div>Total: {item.total_size_pretty}</div>
                    <div className="text-xs text-muted-foreground">
                      Table: {item.table_size_pretty} · Index: {item.index_size_pretty}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
