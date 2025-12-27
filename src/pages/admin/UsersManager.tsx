import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useUsersStats } from '@/hooks/useUsersStats';

export default function UsersManager() {
  const { data: users = [], isLoading } = useUsersStats();

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
                    <TableCell>{user.attempt_count.toLocaleString('fa-IR')}</TableCell>
                    <TableCell>{user.correct_count.toLocaleString('fa-IR')}</TableCell>
                    <TableCell>{getAccuracy(user.correct_count, user.attempt_count)}</TableCell>
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
