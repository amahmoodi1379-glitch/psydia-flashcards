import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Search, ChevronRight, ChevronLeft, Edit, Crown, Shield } from 'lucide-react';
import { useUsersWithSubscriptions, type UserWithSubscription } from '@/hooks/useUsersWithSubscriptions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const ITEMS_PER_PAGE = 20;

// Duration to days mapping
const DURATION_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
};

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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState<UserWithSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [selectedDuration, setSelectedDuration] = useState<string>('monthly');
  const [expiryDays, setExpiryDays] = useState<string>('30');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useUsersWithSubscriptions({
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
    search: debouncedSearchQuery,
  });

  const users = data?.rows ?? [];
  const totalCount = data?.totalCount ?? 0;
  const statsLastRefreshedAt = data?.statsLastRefreshedAt ?? null;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const formatStatsRefreshTime = (isoTimestamp: string | null) => {
    if (!isoTimestamp) return 'هنوز انجام نشده';
    return new Date(isoTimestamp).toLocaleString('fa-IR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Auto-update expiryDays when duration changes (only for new subscriptions or explicit change)
  const handleDurationChange = (newDuration: string) => {
    setSelectedDuration(newDuration);
    // Auto-set days based on duration
    setExpiryDays(String(DURATION_DAYS[newDuration] || 30));
  };

  const getAccuracy = (correct: number, total: number) => {
    if (total === 0) return '-';
    return `${Math.round((correct / total) * 100)}%`;
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleEditClick = (user: UserWithSubscription) => {
    setEditingUser(user);
    setSelectedPlan(user.subscription?.plan || 'free');
    setSelectedDuration(user.subscription?.duration || 'monthly');
    setIsAdmin(user.is_admin || false);
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
      // Update subscription
      let expiresAt: string | null = null;
      if (selectedPlan !== 'free') {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + parseInt(expiryDays));
        expiresAt = expiry.toISOString();
      }

      const { data: subData, error: subError } = await supabase.rpc('admin_update_subscription', {
        _user_id: editingUser.id,
        _plan: selectedPlan as "free" | "basic" | "advanced" | "smart",
        _duration: selectedPlan === 'free' ? null : selectedDuration as "monthly" | "quarterly",
        _expires_at: expiresAt,
      });

      if (subError) throw subError;
      if (!subData) throw new Error('Subscription update failed');

      // Update admin status
      const wasAdmin = editingUser.is_admin || false;
      if (isAdmin !== wasAdmin) {
        const { data: adminData, error: adminError } = await supabase.rpc('toggle_admin_role', {
          _target_user_id: editingUser.id,
          _make_admin: isAdmin,
        });

        if (adminError) throw adminError;
        if (!adminData) throw new Error('Admin role update failed');
      }

      toast.success('اطلاعات کاربر بروزرسانی شد');
      queryClient.invalidateQueries({ queryKey: ['admin-users-subscriptions'] });
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('خطا در بروزرسانی اطلاعات');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">مدیریت کاربران</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base md:text-lg">
                لیست کاربران ({totalCount.toLocaleString('fa-IR')} نفر)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                آخرین بروزرسانی آمار: {formatStatsRefreshTime(statsLastRefreshedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="جستجو نام یا آیدی..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1 sm:w-56"
              />
              <Button variant="outline" size="icon" disabled>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {isFetching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال بروزرسانی...
                </div>
              )}

              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نام نمایشی</TableHead>
                      <TableHead>آیدی تلگرام</TableHead>
                      <TableHead>نقش</TableHead>
                      <TableHead>اشتراک</TableHead>
                      <TableHead>انقضا</TableHead>
                      <TableHead>پاسخ</TableHead>
                      <TableHead>دقت</TableHead>
                      <TableHead>عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.display_name || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{user.telegram_id || '-'}</TableCell>
                        <TableCell>
                          {user.is_admin && (
                            <Badge className="bg-destructive/10 text-destructive">
                              <Shield className="w-3 h-3 mr-1" />
                              ادمین
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={PLAN_COLORS[user.subscription?.plan || 'free']}>
                            {PLAN_LABELS[user.subscription?.plan || 'free']}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.subscription?.expires_at
                            ? new Date(user.subscription.expires_at).toLocaleDateString('fa-IR')
                            : '-'}
                        </TableCell>
                        <TableCell>{user.attempt_count.toLocaleString('fa-IR')}</TableCell>
                        <TableCell>{getAccuracy(user.correct_count, user.attempt_count)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          {searchQuery ? 'هیچ کاربری با این مشخصات یافت نشد' : 'هیچ کاربری یافت نشد'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden space-y-2">
                {users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    {searchQuery ? 'هیچ کاربری با این مشخصات یافت نشد' : 'هیچ کاربری یافت نشد'}
                  </p>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.id}
                      className="bg-card border border-border rounded-xl p-3 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">
                            {user.display_name || 'بدون نام'}
                          </span>
                          {user.is_admin && (
                            <Badge className="bg-destructive/10 text-destructive text-xs py-0 h-5">
                              <Shield className="w-3 h-3 ml-0.5" />
                              ادمین
                            </Badge>
                          )}
                          <Badge className={`${PLAN_COLORS[user.subscription?.plan || 'free']} text-xs py-0 h-5`}>
                            {PLAN_LABELS[user.subscription?.plan || 'free']}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {user.telegram_id || '-'}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>{user.attempt_count.toLocaleString('fa-IR')} پاسخ</span>
                          <span>دقت: {getAccuracy(user.correct_count, user.attempt_count)}</span>
                          {user.subscription?.expires_at && (
                            <span>
                              انقضا: {new Date(user.subscription.expires_at).toLocaleDateString('fa-IR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(user)}
                        className="shrink-0 h-8 w-8 p-0"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                    قبلی
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentPage.toLocaleString('fa-IR')} / {totalPages.toLocaleString('fa-IR')}
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

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              ویرایش کاربر
            </DialogTitle>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{editingUser.display_name || 'بدون نام'}</p>
                <p className="text-sm text-muted-foreground">{editingUser.telegram_id || '-'}</p>
              </div>

              {/* Admin Toggle */}
              <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-destructive" />
                  <Label htmlFor="admin-toggle">دسترسی ادمین</Label>
                </div>
                <Switch
                  id="admin-toggle"
                  checked={isAdmin}
                  onCheckedChange={setIsAdmin}
                />
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
                    <Select value={selectedDuration} onValueChange={handleDurationChange}>
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
