import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Listing, PropertyRequest, PropertyBooking } from '../types';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Phone,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Building,
  Home,
  ShieldCheck,
  ChevronLeft,
  Calendar,
  DollarSign,
  User,
  X
} from 'lucide-react';

interface SeekerBookingsPageProps {
  onSelectListing: (listing: Listing) => void;
  onNavigateToSearch: () => void;
}

export const SeekerBookingsPage: React.FC<SeekerBookingsPageProps> = ({
  onSelectListing,
  onNavigateToSearch
}) => {
  const {
    currentUser,
    requests,
    bookings,
    listings,
    cancelPropertyRequest,
    cancelBooking,
    fetchRequestsAndBookings
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'pending' | 'completed' | 'inactive'>('all');
  const [cancelModalTarget, setCancelModalTarget] = useState<PropertyBooking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Seeker requests only
  const myRequests = requests.filter(r => r.seekerId === currentUser.id);

  // Filter requests
  const filteredRequests = myRequests.filter(req => {
    const linkedBooking = bookings.find(b => b.requestId === req.id || b.id === req.bookingId);
    const isBookingActive = linkedBooking && linkedBooking.status === 'active' && new Date(linkedBooking.expiresAt).getTime() > Date.now();

    // Query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        req.listingTitle.toLowerCase().includes(q) ||
        req.listingNumber.toLowerCase().includes(q) ||
        req.requestNumber.toLowerCase().includes(q) ||
        req.advertiserName.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return isBookingActive;
    if (activeFilter === 'pending') return req.status === 'pending';
    if (activeFilter === 'completed') return req.status === 'accepted' && linkedBooking?.status === 'completed';
    if (activeFilter === 'inactive') {
      return (
        req.status === 'rejected' ||
        req.status === 'cancelled' ||
        (linkedBooking && (linkedBooking.status === 'cancelled' || linkedBooking.status === 'expired'))
      );
    }
    return true;
  });

  // Calculate quick stats
  const activeBookingsCount = bookings.filter(
    b => b.seekerId === currentUser.id && b.status === 'active' && new Date(b.expiresAt).getTime() > Date.now()
  ).length;
  const pendingRequestsCount = myRequests.filter(r => r.status === 'pending').length;
  const completedDealsCount = bookings.filter(b => b.seekerId === currentUser.id && b.status === 'completed').length;

  const handleConfirmCancelBooking = async () => {
    if (!cancelModalTarget) return;
    setIsCancelling(true);
    await cancelBooking(cancelModalTarget.id, cancelReason || 'إلغاء بناءً على رغبة الباحث');
    setIsCancelling(false);
    setCancelModalTarget(null);
    setCancelReason('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
            <span>لوحة الباحث</span>
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="text-[#12A889]">طلباتي وحجوزاتي</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#16324F] flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-[#12A889]" />
            <span>متابعة طلبات العقارات والحجوزات المؤقتة</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تتبع طلبات المعاينة، عروض الأسعار، والحجوزات المؤقتة الجارية لفحص بصائر الملكية
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchRequestsAndBookings()}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
            title="تحديث البيانات من الخادم"
          >
            <RefreshCw className="w-4 h-4 text-[#12A889]" />
            <span className="hidden sm:inline">تحديث الحالات</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToSearch}
            className="px-4 py-2.5 bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>استعراض العقارات</span>
          </button>
        </div>
      </div>

      {/* KPI Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">حجوزات مؤقتة نشطة</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-800">{activeBookingsCount}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">طلبات بانتظار المعلن</span>
          <span className="text-2xl font-black text-amber-700">{pendingRequestsCount}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">صفقات منجزة بنجاح</span>
          <span className="text-2xl font-black text-slate-900">{completedDealsCount}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي طلباتي المسجلة</span>
          <span className="text-2xl font-black text-[#16324F]">{myRequests.length}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'الكل', count: myRequests.length },
            { id: 'active', label: 'حجوزات نشطة', count: activeBookingsCount },
            { id: 'pending', label: 'قيد الانتظار', count: pendingRequestsCount },
            { id: 'completed', label: 'مكتملة', count: completedDealsCount },
            {
              id: 'inactive',
              label: 'ملغاة / مرفوضة',
              count: myRequests.length - (activeBookingsCount + pendingRequestsCount + completedDealsCount)
            }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeFilter === tab.id
                  ? 'bg-[#16324F] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Live Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الطلب أو اسم العقار..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#12A889]"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Requests & Bookings List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-2xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-800 text-base">لا توجد طلبات في هذا التصنيف</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? 'لا توجد نتائج مطابقة لبحثك، جرب استخدام كلمات بحث أخرى.'
                : 'تصفح قائمة العقارات المتاحة للبيع أو الإيجار وقدم طلب حجز مؤقت لمعاينة العقار ومطابقة وثائق الملكية.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToSearch}
            className="px-5 py-2.5 bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold rounded-xl transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>استعراض العقارات المتاحة</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map(req => {
            const linkedBooking = bookings.find(b => b.requestId === req.id || b.id === req.bookingId);
            const isBookingActive =
              linkedBooking &&
              linkedBooking.status === 'active' &&
              new Date(linkedBooking.expiresAt).getTime() > Date.now();
            const isPending = req.status === 'pending';
            const isRejected = req.status === 'rejected';
            const isCancelled = req.status === 'cancelled';
            const isCompleted = linkedBooking?.status === 'completed';

            // Calculate remaining time for active booking
            let remainingText = '';
            let progressPercent = 100;
            if (isBookingActive && linkedBooking) {
              const totalMs = (linkedBooking.durationHours || 48) * 3600 * 1000;
              const remainingMs = new Date(linkedBooking.expiresAt).getTime() - Date.now();
              const hours = Math.max(0, Math.floor(remainingMs / (1000 * 3600)));
              const minutes = Math.max(0, Math.floor((remainingMs % (1000 * 3600)) / (1000 * 60)));
              remainingText = `${hours} ساعة و ${minutes} دقيقة`;
              progressPercent = Math.min(100, Math.max(5, Math.round((remainingMs / totalMs) * 100)));
            }

            const targetListing = listings.find(l => l.id === req.listingId);

            return (
              <div
                key={req.id}
                className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all shadow-2xs space-y-4 ${
                  isBookingActive
                    ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                    : isPending
                    ? 'border-amber-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Top Row: IDs, Property Purpose, and Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {req.requestNumber}
                    </span>
                    {linkedBooking && (
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>رقم الحجز: {linkedBooking.bookingNumber}</span>
                      </span>
                    )}
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      req.listingPurpose === 'rent' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {req.listingPurpose === 'rent' ? 'عقار للإيجار' : 'عقار للبيع'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      تاريخ الطلب: {req.createdAt}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isBookingActive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                        <span>حجز مؤقت سارٍ ومؤكد</span>
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>قيد مراجعة المعلن</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تمت الصفقة بنجاح</span>
                      </span>
                    ) : isRejected ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-900 font-extrabold text-xs border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>اعتذر المعلن عن الطلب</span>
                      </span>
                    ) : isCancelled ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-extrabold text-xs border border-slate-200">
                        <span>تم إلغاء الطلب</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-extrabold text-xs border border-slate-200">
                        <span>حجز منتهٍ لمرور الوقت</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Content Split: Property details + Request details */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Property Preview (Col 1-5) */}
                  <div className="md:col-span-5 flex items-start gap-3.5 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <img
                      src={req.listingImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=300&q=80'}
                      alt={req.listingTitle}
                      className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400 block">
                        {req.listingNumber}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1" title={req.listingTitle}>
                        {req.listingTitle}
                      </h4>
                      <p className="text-emerald-700 font-extrabold text-xs font-mono">
                        {req.listingPrice.toLocaleString()} {req.listingCurrency}
                      </p>
                      {targetListing && (
                        <button
                          type="button"
                          onClick={() => onSelectListing(targetListing)}
                          className="text-[11px] text-[#12A889] hover:underline font-bold flex items-center gap-1 pt-0.5 cursor-pointer"
                        >
                          <span>معاينة صفحة الإعلان الكاملة</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Request Parameters & Advertiser Details (Col 6-12) */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block mb-0.5">المعلن المسؤول:</span>
                        <span className="font-bold text-slate-800">{req.advertiserName}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] block mb-0.5">نوع الطلب المقدم:</span>
                        <span className="font-bold text-emerald-800">
                          {req.requestType === 'booking_intent'
                            ? 'حجز مؤقت وشراء'
                            : req.requestType === 'visit_inquiry'
                            ? 'معاينة ميدانية'
                            : 'تقديم عرض سعر'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] block mb-0.5">المدة المطلوبة:</span>
                        <span className="font-bold text-slate-800 font-mono">{req.requestedDurationHours || 48} ساعة</span>
                      </div>

                      {req.preferredDate && (
                        <div>
                          <span className="text-slate-400 text-[11px] block mb-0.5">موعد المعاينة المقترح:</span>
                          <span className="font-bold text-slate-800 font-mono">{req.preferredDate}</span>
                        </div>
                      )}

                      {req.paymentMethod && (
                        <div>
                          <span className="text-slate-400 text-[11px] block mb-0.5">طريقة السداد:</span>
                          <span className="font-bold text-slate-800 truncate block">{req.paymentMethod}</span>
                        </div>
                      )}

                      {req.rentalUsageType && (
                        <div>
                          <span className="text-slate-400 text-[11px] block mb-0.5">استخدام الإيجار:</span>
                          <span className="font-bold text-slate-800">{req.rentalUsageType}</span>
                        </div>
                      )}

                      {req.offeredPrice && (
                        <div>
                          <span className="text-slate-400 text-[11px] block mb-0.5">السعر المقترح:</span>
                          <span className="font-bold text-emerald-700 font-mono">{req.offeredPrice.toLocaleString()} {req.listingCurrency}</span>
                        </div>
                      )}
                    </div>

                    {req.notes && (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-600">
                        <span className="font-bold text-slate-700 block mb-0.5">ملاحظاتك للمعلن:</span>
                        <p>{req.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTIVE BOOKING COUNTDOWN STRIP */}
                {isBookingActive && linkedBooking && (
                  <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-slate-50 rounded-2xl border border-emerald-300 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-700" />
                        <span className="font-black text-xs sm:text-sm text-emerald-950">
                          الوقت المتبقي لانتهاء الحجز المؤقت:
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white font-mono font-black text-xs">
                          {remainingText}
                        </span>
                      </div>

                      <div className="text-[11px] text-emerald-900 font-medium">
                        ينتهي بتاريخ:{' '}
                        <strong className="font-mono">
                          {new Date(linkedBooking.expiresAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
                        </strong>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#12A889] to-emerald-500 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      💡 العقار مقفول حصرياً باسمك ولا يمكن لأي مشترٍ آخر حجزه طوال هذه الفترة. يُرجى التنسيق المباشر مع المعلن لمطابقة صكوك الملكية والمعاينة.
                    </p>
                  </div>
                )}

                {/* REJECTION REASON NOTIFICATION */}
                {isRejected && req.rejectionReason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                    <span className="font-bold block mb-0.5">سبب اعتذار المعلن:</span>
                    <p>{req.rejectionReason}</p>
                  </div>
                )}

                {/* BOTTOM ACTIONS BAR */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                  {/* Direct Contact Buttons */}
                  <div className="flex items-center gap-2">
                    {req.advertiserPhone && (
                      <>
                        <a
                          href={`tel:${req.advertiserPhone}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#16324F] hover:text-white text-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#12A889]" />
                          <span>اتصال بالمعلن ({req.advertiserPhone})</span>
                        </a>

                        <a
                          href={`https://wa.me/967${req.advertiserPhone.replace(/^0+/, '')}?text=${encodeURIComponent(
                            `مرحباً، أستفسر بخصوص طلبي ${req.requestNumber} على العقار ${req.listingNumber} في منصة دلنّي.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 text-xs font-bold transition-colors border border-emerald-200 flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>واتساب</span>
                        </a>
                      </>
                    )}
                  </div>

                  {/* Mutation Controls */}
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('هل تؤكد رغبتك بإلغاء هذا الطلب؟')) {
                            await cancelPropertyRequest(req.id, 'إلغاء بناءً على رغبة الباحث');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors border border-rose-200 cursor-pointer"
                      >
                        إلغاء الطلب
                      </button>
                    )}

                    {isBookingActive && linkedBooking && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelModalTarget(linkedBooking);
                          setCancelReason('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors border border-rose-200 cursor-pointer"
                      >
                        إلغاء الحجز المؤقت
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CANCEL BOOKING MODAL */}
      {cancelModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-800 font-extrabold text-base">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>إلغاء الحجز المؤقت</span>
              </div>
              <button
                onClick={() => setCancelModalTarget(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                أنت بصدد إلغاء الحجز المؤقت على العقار{' '}
                <strong className="text-slate-900">{cancelModalTarget.listingTitle}</strong> ({cancelModalTarget.bookingNumber}).
              </p>
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                عند الإلغاء، سيتم رفع القفل الحصري عن العقار وإتاحته مجدداً للجمهور ولطلبات الحجز من باحثين آخرين.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                سبب الإلغاء (اختياري):
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="مثال: لم يعد العقار مناسباً لاحتياجي الحالي، أو عدم الاتفاق على السعر..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-rose-500 outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelModalTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancelBooking}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? 'جاري الإلغاء...' : 'تأكيد إلغاء الحجز'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
