import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Search, ChevronRight, ChevronLeft, Edit, Crown } from 'lucide-react';
import { useUsersWithSubscriptions } from '@/hooks/useUsersWithSubscriptions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const ITEMS_PER_PAGE = 20;

const PLAN_LABELS: Record<string, string> = {
  free: 'رایگان',
  basic: 'پایه',
  advanced: 'پیشرفته',
  smart: 'هوشمند',
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  basic: 'bg-primary/10 text-primary',
  advanced: 'bg-accent/10 text-accent',
  smart: 'bg-success/10 text-success',
};

export default function UsersManager() {
  const { data: allUsers = [], isLoading } = useUsersWithSubscriptions();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState<typeof allUsers[0] | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [selectedDuration, setSelectedDuration] = useState<string>('monthly');
  const [expiryDays, setExpiryDays] = useState<string>('30');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

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

  const handleEditClick = (user: typeof allUsers[0]) => {
    setEditingUser(user);
    setSelectedPlan(user.subscription?.plan || 'free');
    setSelectedDuration(user.subscription?.duration || 'monthly');
    if (user.subscription?.expires_at) {
      const days = Math.ceil((new Date(user.subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      setExpiryDays(String(Math.max(1, days)));
    } else {
      setExpiryDays('30');
    }
  };

  const handleSaveSubscription = async () => {
    if (!editingUser) return;
    
    setIsSaving(true);
    try {
      let expiresAt: string | null = null;
      if (selectedPlan !== 'free') {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + parseInt(expiryDays));
        expiresAt = expiry.toISOString();
      }

      const { data, error } = await supabase.rpc('admin_update_subscription', {
        _user_id: editingUser.id,
        _plan: selectedPlan as "free" | "basic" | "advanced" | "smart",
        _duration: selectedPlan === 'free' ? null : selectedDuration as "monthly" | "quarterly",
        _expires_at: expiresAt,
      });

      if (error) throw error;
      if (!data) throw new Error('Update failed');

      toast.success('اشتراک کاربر بروزرسانی شد');
      queryClient.invalidateQueries({ queryKey: ['admin-users-subscriptions'] });
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('خطا در بروزرسانی اشتراک');
    } finally {
      setIsSaving(false);
    }
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
                    <TableHead>اشتراک</TableHead>
                    <TableHead>انقضا</TableHead>
                    <TableHead>تعداد پاسخ</TableHead>
                    <TableHead>دقت</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.display_name || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{user.telegram_id || '-'}</TableCell>
                      <TableCell>
                        <Badge className={PLAN_COLORS[user.subscription?.plan || 'free']}>
                          {PLAN_LABELS[user.subscription?.plan || 'free']}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.subscription?.expires_at 
                          ? new Date(user.subscription.expires_at).toLocaleDateString('fa-IR')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>{user.attempt_count.toLocaleString('fa-IR')}</TableCell>
                      <TableCell>{getAccuracy(user.correct_count, user.attempt_count)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditClick(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
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

      {/* Edit Subscription Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              ویرایش اشتراک
            </DialogTitle>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{editingUser.display_name || 'بدون نام'}</p>
                <p className="text-sm text-muted-foreground">{editingUser.telegram_id || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label>پلن اشتراک</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">رایگان</SelectItem>
                    <SelectItem value="basic">پایه</SelectItem>
                    <SelectItem value="advanced">پیشرفته</SelectItem>
                    <SelectItem value="smart">هوشمند</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedPlan !== 'free' && (
                <>
                  <div className="space-y-2">
                    <Label>نوع اشتراک</Label>
                    <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">ماهانه</SelectItem>
                        <SelectItem value="quarterly">سه ماهه</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>مدت اعتبار (روز)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              انصراف
            </Button>
            <Button onClick={handleSaveSubscription} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
