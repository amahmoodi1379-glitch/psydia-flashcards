import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FolderTree, FileText, HardDrive, HelpCircle, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Supabase free tier: 500 MB database
const FREE_TIER_DB_BYTES = 500 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getUsageColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 70) return 'bg-orange-500';
  if (percent >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getUsageTextColor(percent: number): string {
  if (percent >= 90) return 'text-red-500';
  if (percent >= 70) return 'text-orange-500';
  if (percent >= 50) return 'text-yellow-500';
  return 'text-green-500';
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase.rpc as any)('get_table_storage_report'),
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
          setStorageStats((tableStorage.data as unknown as TableStorageStat[] | null) || []);
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

  const totalDbBytes = storageStats.reduce((sum, s) => sum + s.total_size_bytes, 0);
  const usagePercent = Math.min((totalDbBytes / FREE_TIER_DB_BYTES) * 100, 100);
  const remainingBytes = Math.max(FREE_TIER_DB_BYTES - totalDbBytes, 0);
  const maxTableBytes = Math.max(...storageStats.map(s => s.total_size_bytes), 1);

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">داشبورد</h1>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
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

      {/* Free Tier Usage Overview */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">وضعیت Free Tier سوپابیس</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">محدودیت دیتابیس: ۵۰۰ مگابایت</p>
          </div>
          {!isLoading && (
            usagePercent >= 70 ? (
              <AlertTriangle className={cn('h-5 w-5', getUsageTextColor(usagePercent))} />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm">در حال بارگذاری...</div>
          ) : (
            <div className="space-y-4">
              {/* Main usage bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('text-2xl font-bold', getUsageTextColor(usagePercent))}>
                    {usagePercent.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground" dir="ltr">
                    {formatBytes(totalDbBytes)} / {formatBytes(FREE_TIER_DB_BYTES)}
                  </span>
                </div>
                <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', getUsageColor(usagePercent))}
                    style={{ width: `${Math.max(usagePercent, 0.5)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    باقی‌مانده: <span className="font-medium text-foreground" dir="ltr">{formatBytes(remainingBytes)}</span>
                  </span>
                  {usagePercent >= 90 && (
                    <span className="text-xs text-red-500 font-medium">
                      بحرانی! ارتقا دهید
                    </span>
                  )}
                  {usagePercent >= 70 && usagePercent < 90 && (
                    <span className="text-xs text-orange-500 font-medium">
                      هشدار: فضا رو به اتمام
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-table breakdown */}
      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">پایش حجم جداول کلیدی</CardTitle>
          <HardDrive className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm">در حال بارگذاری...</div>
          ) : storageStats.length === 0 ? (
            <div className="text-muted-foreground text-sm">داده‌ای برای نمایش وجود ندارد.</div>
          ) : (
            <div className="space-y-3">
              {storageStats.map((item) => {
                const tablePercent = (item.total_size_bytes / FREE_TIER_DB_BYTES) * 100;
                const relativePercent = (item.total_size_bytes / maxTableBytes) * 100;
                return (
                  <div key={item.table_name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm truncate">{item.table_name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({item.row_estimate.toLocaleString('fa-IR')} ردیف)
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0 mr-2" dir="ltr">
                        <span className="font-medium text-foreground">{item.total_size_pretty}</span>
                        <span className="text-muted-foreground"> ({tablePercent.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', getUsageColor(tablePercent * 2))}
                        style={{ width: `${Math.max(relativePercent, 1)}%` }}
                      />
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground" dir="ltr">
                      <span>Table: {item.table_size_pretty}</span>
                      <span>Index: {item.index_size_pretty}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
