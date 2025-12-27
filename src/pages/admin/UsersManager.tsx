import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { useUsersStats } from '@/hooks/useUsersStats';

const ITEMS_PER_PAGE = 20;

export default function UsersManager() {
  const { data: allUsers = [], isLoading } = useUsersStats();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return allUsers;
    const query = searchQuery.toLowerCase();
    return allUsers.filter(user => 
      user.display_name?.toLowerCase().includes(query) ||
      user.telegram_id?.toLowerCase().includes(query)
    );
  }, [allUsers, searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const getAccuracy = (correct: number, total: number) => {
    if (total === 0) return '-';
    return `${Math.round((correct / total) * 100)}%`;
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">مدیریت کاربران</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>لیست کاربران ({filteredUsers.length.toLocaleString('fa-IR')} نفر)</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="جستجو نام یا آیدی تلگرام..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-64"
              />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام نمایشی</TableHead>
                    <TableHead>آیدی تلگرام</TableHead>
                    <TableHead>تعداد پاسخ</TableHead>
                    <TableHead>پاسخ صحیح</TableHead>
                    <TableHead>دقت</TableHead>
                    <TableHead>تاریخ عضویت</TableHead>
                    <TableHead>آخرین فعالیت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
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
                  {paginatedUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {searchQuery ? 'هیچ کاربری با این مشخصات یافت نشد' : 'هیچ کاربری یافت نشد'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                    قبلی
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">
                    صفحه {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    بعدی
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
