import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  display_name: string | null;
  telegram_id: string | null;
  created_at: string;
  updated_at: string;
  attempt_count?: number;
  correct_count?: number;
}

export default function UsersManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;

        // Fetch attempt counts for each user
        const userStats = await Promise.all(
          (profiles || []).map(async (profile) => {
            const { count: attemptCount } = await supabase
              .from('attempt_logs')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', profile.id);

            const { count: correctCount } = await supabase
              .from('attempt_logs')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', profile.id)
              .eq('is_correct', true);

            return {
              ...profile,
              attempt_count: attemptCount || 0,
              correct_count: correctCount || 0,
            };
          })
        );

        setUsers(userStats);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('خطا در دریافت کاربران');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const getAccuracy = (correct: number, total: number) => {
    if (total === 0) return '-';
    return `${Math.round((correct / total) * 100)}%`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">مدیریت کاربران</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>لیست کاربران</CardTitle>
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
                  <TableHead>نام نمایشی</TableHead>
                  <TableHead>شناسه تلگرام</TableHead>
                  <TableHead>تعداد پاسخ</TableHead>
                  <TableHead>پاسخ صحیح</TableHead>
                  <TableHead>دقت</TableHead>
                  <TableHead>تاریخ عضویت</TableHead>
                  <TableHead>آخرین فعالیت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.display_name || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{user.telegram_id || '-'}</TableCell>
                    <TableCell>{user.attempt_count?.toLocaleString('fa-IR')}</TableCell>
                    <TableCell>{user.correct_count?.toLocaleString('fa-IR')}</TableCell>
                    <TableCell>{getAccuracy(user.correct_count || 0, user.attempt_count || 0)}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString('fa-IR')}</TableCell>
                    <TableCell>{new Date(user.updated_at).toLocaleDateString('fa-IR')}</TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      هیچ کاربری یافت نشد
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
