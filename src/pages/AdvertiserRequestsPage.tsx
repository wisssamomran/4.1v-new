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
  PlusCircle,
  Lock,
  X,
  Sliders
} from 'lucide-react';

interface AdvertiserRequestsPageProps {
  onSelectListing: (listing: Listing) => void;
  onNavigateToMyAds: () => void;
  onNavigateToWizard: () => void;
}

export const AdvertiserRequestsPage: React.FC<AdvertiserRequestsPageProps> = ({
  onSelectListing,
  onNavigateToMyAds,
  onNavigateToWizard
}) => {
  const {
    currentUser,
    requests,
    bookings,
    listings,
    acceptPropertyRequest,
    rejectPropertyRequest,
    cancelBooking,
    extendBooking,
    completeBooking,
    fetchRequestsAndBookings
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'active' | 'completed' | 'inactive'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [acceptModalRequest, setAcceptModalRequest] = useState<PropertyRequest | null>(null);
  const [acceptDuration, setAcceptDuration] = useState<number>(48);
  const [acceptNotes, setAcceptNotes] = useState<string>('');
  const [isAccepting, setIsAccepting] = useState(false);

  const [rejectModalRequest, setRejectModalRequest] = useState<PropertyRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [extendModalTarget, setExtendModalTarget] = useState<PropertyBooking | null>(null);
  const [extendHours, setExtendHours] = useState<number>(24);
  const [isExtending, setIsExtending] = useState(false);

  const [cancelBookingTarget, setCancelBookingTarget] = useState<PropertyBooking | null>(null);
  const [cancelBookingReason, setCancelBookingReason] = useState<string>('');
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);

  // Incoming requests filtering according to user role
  const incomingRequests = requests.filter(r => {
    if (currentUser.role === 'system_admin') return true;
    if (currentUser.role === 'org_manager' || currentUser.role === 'org_agent') {
      const listing = listings.find(l => l.id === r.listingId);
      const isOrgListing = listing && currentUser.orgId && listing.advertiser.orgId === currentUser.orgId;
      const isAssigned = listing && listing.assignedAgentId === currentUser.id;
      return r.advertiserId === currentUser.id || isOrgListing || isAssigned;
    }
    return r.advertiserId === currentUser.id;
  });

  // Filtered requests list
  const filteredRequests = incomingRequests.filter(req => {
    const linkedBooking = bookings.find(b => b.requestId === req.id || b.id === req.bookingId);
    const isBookingActive = linkedBooking && linkedBooking.status === 'active' && new Date(linkedBooking.expiresAt).getTime() > Date.now();

    // Query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        req.listingTitle.toLowerCase().includes(q) ||
        req.listingNumber.toLowerCase().includes(q) ||
        req.requestNumber.toLowerCase().includes(q) ||
        req.seekerName.toLowerCase().includes(q) ||
        req.seekerPhone.includes(q);
      if (!match) return false;
    }

    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return req.status === 'pending';
    if (activeFilter === 'active') return isBookingActive;
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

  // KPI counts
  const pendingCount = incomingRequests.filter(r => r.status === 'pending').length;
  const activeBookingsCount = bookings.filter(b => {
    const isMine = b.advertiserId === currentUser.id || currentUser.role === 'system_admin';
    return isMine && b.status === 'active' && new Date(b.expiresAt).getTime() > Date.now();
  }).length;
  const completedCount = bookings.filter(b => {
    const isMine = b.advertiserId === currentUser.id || currentUser.role === 'system_admin';
    return isMine && b.status === 'completed';
  }).length;

  // Handlers
  const handleConfirmAccept = async () => {
    if (!acceptModalRequest) return;
    setIsAccepting(true);
    await acceptPropertyRequest(acceptModalRequest.id, acceptDuration, acceptNotes);
    setIsAccepting(false);
    setAcceptModalRequest(null);
    setAcceptNotes('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalRequest) return;
    setIsRejecting(true);
    await rejectPropertyRequest(rejectModalRequest.id, rejectReason || 'اعتذار لعدم ملاءمة الشروط أو وجود اتفاق مسبق');
    setIsRejecting(false);
    setRejectModalRequest(null);
    setRejectReason('');
  };

  const handleConfirmExtend = async () => {
    if (!extendModalTarget) return;
    setIsExtending(true);
    await extendBooking(extendModalTarget.id, extendHours);
    setIsExtending(false);
    setExtendModalTarget(null);
  };

  const handleConfirmCancelBooking = async () => {
    if (!cancelBookingTarget) return;
    setIsCancellingBooking(true);
    await cancelBooking(cancelBookingTarget.id, cancelBookingReason || 'إلغاء الحجز المؤقت باتفاق الطرفين');
    setIsCancellingBooking(false);
    setCancelBookingTarget(null);
    setCancelBookingReason('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
            <span>لوحة الإعلانات والمنشأة</span>
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="text-[#12A889]">طلبات الحجز الواردة</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#16324F] flex items-center gap-2">
            <Building className="w-6 h-6 text-[#12A889]" />
            <span>لوحة إدارة طلبات الحجز والمعاينات الواردة</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مراجعة طلبات الباحثين، تأكيد الحجوزات المؤقتة لفحص البصائر، إدارة المواعيد وإتمام الصفقات
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onNavigateToMyAds}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <Building className="w-4 h-4 text-slate-500" />
            <span>العودة لإعلاناتي</span>
          </button>

          <button
            type="button"
            onClick={() => fetchRequestsAndBookings()}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="تحديث البيانات من الخادم"
          >
            <RefreshCw className="w-4 h-4 text-[#12A889]" />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToWizard}
            className="px-4 py-2.5 bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة إعلان جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">طلبات جديدة بانتظار قرارك</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700">{pendingCount}</span>
            {pendingCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">حجوزات مؤقتة نشطة سارية</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-800">{activeBookingsCount}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">صفقات مكتملة وناجحة</span>
          <span className="text-2xl font-black text-slate-900">{completedCount}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي الطلبات الواردة</span>
          <span className="text-2xl font-black text-[#16324F]">{incomingRequests.length}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'pending', label: 'بانتظار الموافقة', count: pendingCount, highlight: pendingCount > 0 },
            { id: 'active', label: 'حجوزات سارية', count: activeBookingsCount },
            { id: 'completed', label: 'صفقات مكتملة', count: completedCount },
            { id: 'all', label: 'كافة الطلبات', count: incomingRequests.length },
            {
              id: 'inactive',
              label: 'مرفوضة / منتهية',
              count: incomingRequests.length - (pendingCount + activeBookingsCount + completedCount)
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
                activeFilter === tab.id
                  ? 'bg-white/20 text-white'
                  : tab.highlight
                  ? 'bg-amber-100 text-amber-900 font-bold'
                  : 'bg-slate-100 text-slate-600'
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
            placeholder="بحث برقم الطلب، هاتف الباحث، العقار..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#12A889]"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-2xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-800 text-base">لا توجد طلبات في هذا التصنيف حالياً</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? 'لا توجد نتائج مطابقة لبحثك، جرب استخدام كلمات بحث أخرى.'
                : 'عندما يُرسل الباحثون طلبات حجز أو معاينة لعقاراتك، ستظهر فوراً هنا للموافقة عليها أو الرد.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToMyAds}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Building className="w-4 h-4" />
            <span>استعراض إعلاناتي</span>
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

            // Conflict Check: Is there already an active booking on this property?
            const propertyActiveBooking = bookings.find(
              b => b.listingId === req.listingId && b.status === 'active' && new Date(b.expiresAt).getTime() > Date.now()
            );
            const hasConflict = isPending && propertyActiveBooking && propertyActiveBooking.requestId !== req.id;

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
                    ? hasConflict
                      ? 'border-orange-300 bg-orange-50/10'
                      : 'border-amber-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Top Row: Request Number, Booking Number, Purpose, Status */}
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
                      {req.listingPurpose === 'rent' ? 'إيجار' : 'بيع'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      تاريخ الاستلام: {req.createdAt}
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
                        <span>طلب وارد بانتظار قرارك</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تمت الصفقة بنجاح</span>
                      </span>
                    ) : isRejected ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-900 font-extrabold text-xs border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>تم الاعتذار ورفض الطلب</span>
                      </span>
                    ) : isCancelled ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-extrabold text-xs border border-slate-200">
                        <span>أُلغي من قبل الباحث</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-extrabold text-xs border border-slate-200">
                        <span>حجز منتهٍ</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Conflict Warning Alert if property is already locked */}
                {hasConflict && (
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">تنبيه تعارض: العقار محجوز مؤقتاً حالياً لحاجز آخر</p>
                      <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                        يوجد حجز مؤقت سارٍ برقم <strong>[{propertyActiveBooking?.bookingNumber}]</strong> ينتهي في{' '}
                        <strong>{new Date(propertyActiveBooking?.expiresAt || '').toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}</strong>.
                        لا يمكن قبول وتأكيد هذا الطلب حتى انتهاء الحجز القائم أو إلغائه، حفاظاً على حصرية التعاقد.
                      </p>
                    </div>
                  </div>
                )}

                {/* Main Content Split: Listing Info + Seeker Info */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Property Info (Col 1-5) */}
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
                          <span>عرض تفاصيل العقار</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Seeker Information & Submitted Terms (Col 6-12) */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block mb-0.5">الباحث مقدم الطلب:</span>
                        <span className="font-bold text-slate-800">{req.seekerName}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] block mb-0.5">رقم الهاتف المعتمد:</span>
                        <span className="font-mono font-bold text-slate-800" dir="ltr">{req.seekerPhone}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] block mb-0.5">نوع الطلب:</span>
                        <span className="font-bold text-emerald-800">
                          {req.requestType === 'booking_intent'
                            ? 'طلب حجز مؤقت جاد'
                            : req.requestType === 'visit_inquiry'
                            ? 'معاينة ميدانية'
                            : 'عرض سعر تفاوضي'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] block mb-0.5">المدة المقترحة للحجز:</span>
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
                          <span className="text-slate-400 text-[11px] block mb-0.5">طبيعة الاستخدام:</span>
                          <span className="font-bold text-slate-800">{req.rentalUsageType}</span>
                        </div>
                      )}

                      {req.leaseDurationMonths && (
                        <div>
                          <span className="text-slate-400 text-[11px] block mb-0.5">مدة عقد الإيجار:</span>
                          <span className="font-bold text-slate-800 font-mono">{req.leaseDurationMonths} شهر</span>
                        </div>
                      )}

                      {req.paymentFrequency && (
                        <div>
                          <span className="text-slate-400 text-[11px] block mb-0.5">دورية الإيجار:</span>
                          <span className="font-bold text-slate-800">{req.paymentFrequency}</span>
                        </div>
                      )}

                      {req.offeredPrice && (
                        <div>
                          <span className="text-slate-400 text-[11px] block mb-0.5">السعر المعروض:</span>
                          <span className="font-bold text-emerald-700 font-mono">
                            {req.offeredPrice.toLocaleString()} {req.listingCurrency}
                          </span>
                        </div>
                      )}
                    </div>

                    {req.notes && (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-600">
                        <span className="font-bold text-slate-700 block mb-0.5">ملاحظات الباحث:</span>
                        <p>{req.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTIVE BOOKING COUNTDOWN & MANAGEMENT STRIP */}
                {isBookingActive && linkedBooking && (
                  <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-slate-50 rounded-2xl border border-emerald-300 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-700" />
                        <span className="font-black text-xs sm:text-sm text-emerald-950">
                          الوقت المتبقي لانتهاء الحجز:
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

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#12A889] to-emerald-500 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {/* Booking Management Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-200/60">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setExtendModalTarget(linkedBooking);
                            setExtendHours(24);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition-colors border border-slate-200 cursor-pointer shadow-2xs"
                        >
                          تمديد مدة الحجز
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCancelBookingTarget(linkedBooking);
                            setCancelBookingReason('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors border border-rose-200 cursor-pointer"
                        >
                          إلغاء الحجز وإعادة الإتاحة
                        </button>
                      </div>

                      {/* Finalize Deal Button */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm('هل تم إتمام الصفقة (بيع أو إيجار) بنجاح؟ سيتم تحديث حالة الإعلان إلى (تمت الصفقة) وإغلاقه نهائياً.')) {
                            await completeBooking(linkedBooking.id, 'تمت الصفقة بنجاح وتم توقيع العقد/البصيرة');
                          }
                        }}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>إتمام الصفقة رسمياً</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* BOTTOM ROW: ACTIONS & CONTACT */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                  {/* Seeker Direct Contact */}
                  <div className="flex items-center gap-2">
                    {req.seekerPhone && (
                      <>
                        <a
                          href={`tel:${req.seekerPhone}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#16324F] hover:text-white text-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#12A889]" />
                          <span>اتصال بالباحث ({req.seekerPhone})</span>
                        </a>

                        <a
                          href={`https://wa.me/967${req.seekerPhone.replace(/^0+/, '')}?text=${encodeURIComponent(
                            `مرحباً ${req.seekerName}، بخصوص طلبك ${req.requestNumber} على العقار ${req.listingNumber} في منصة دلنّي.`
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

                  {/* Decision Controls for Pending Requests */}
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectModalRequest(req);
                          setRejectReason('');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                      >
                        اعتذار ورفض
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(hasConflict)}
                        onClick={() => {
                          setAcceptModalRequest(req);
                          setAcceptDuration(req.requestedDurationHours || 48);
                          setAcceptNotes('');
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                          hasConflict
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-[#12A889] hover:bg-[#0f8e74] text-white hover:shadow-md'
                        }`}
                        title={hasConflict ? 'لا يمكن القبول لوجود حجز سارٍ على العقار' : 'قبول الطلب وتأكيد الحجز'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>قبول وتأكيد الحجز المؤقت</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. ACCEPT REQUEST MODAL */}
      {acceptModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 text-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>قبول الطلب وتأكيد الحجز المؤقت</span>
              </div>
              <button
                onClick={() => setAcceptModalRequest(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                أنت بصدد تأكيد حجز مؤقت للعقار{' '}
                <strong className="text-slate-900">{acceptModalRequest.listingTitle}</strong> لصالح الباحث{' '}
                <strong className="text-slate-900">{acceptModalRequest.seekerName}</strong>.
              </p>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 text-[11px] leading-relaxed">
                ✓ سيتم قفل العقار حصرياً ومنع ظهور أو تأكيد أي حجوزات متعارضة طوال مدة الحجز المعتمدة أدناه.
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                تحديد مدة الحجز المؤقت المعتمدة:
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { h: 24, label: '24 ساعة' },
                  { h: 48, label: '48 ساعة' },
                  { h: 72, label: '72 ساعة' },
                  { h: 120, label: '5 أيام' },
                  { h: 168, label: '7 أيام' }
                ].map(opt => (
                  <button
                    key={opt.h}
                    type="button"
                    onClick={() => setAcceptDuration(opt.h)}
                    className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      acceptDuration === opt.h
                        ? 'border-[#12A889] bg-[#12A889] text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رسالة تأكيد وتوجيهات للباحث (اختياري):
              </label>
              <textarea
                value={acceptNotes}
                onChange={e => setAcceptNotes(e.target.value)}
                placeholder="مثال: أهلاً بك، تم تأكيد الحجز ونرحب بك غداً في مقر المكتب لمطابقة البصيرة الشرعية..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#12A889] outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAcceptModalRequest(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isAccepting}
                onClick={handleConfirmAccept}
                className="px-6 py-2 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isAccepting ? 'جاري التأكيد...' : 'تأكيد وقفل العقار'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. REJECT REQUEST MODAL */}
      {rejectModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-800 font-extrabold text-base">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>الاعتذار عن قبول الطلب</span>
              </div>
              <button
                onClick={() => setRejectModalRequest(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              <p>
                أنت بصدد الاعتذار عن الطلب المقدم من{' '}
                <strong className="text-slate-900">{rejectModalRequest.seekerName}</strong>.
              </p>
            </div>

            {/* Quick preset reasons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                سبب الاعتذار:
              </label>
              <div className="space-y-1.5 mb-2">
                {[
                  'تم الاتفاق والارتباط مع مشترٍ آخر',
                  'السعر المقترح في العرض غير مناسب للمالك',
                  'شروط الدفع أو مدة الإيجار لا تتطابق مع طلب المالك',
                  'العقار تحت إجراءات توثيق خاصة حالياً'
                ].map(reasonText => (
                  <button
                    key={reasonText}
                    type="button"
                    onClick={() => setRejectReason(reasonText)}
                    className="w-full text-right p-2 rounded-lg text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 block transition-colors cursor-pointer"
                  >
                    • {reasonText}
                  </button>
                ))}
              </div>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="أو اكتب سبباً مخصصاً يظهر للباحث..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-rose-500 outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalRequest(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={isRejecting}
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isRejecting ? 'جاري التسجيل...' : 'تسجيل الاعتذار'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. EXTEND DURATION MODAL */}
      {extendModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base">
                <Clock className="w-5 h-5 text-emerald-600" />
                <span>تمديد مدة الحجز المؤقت</span>
              </div>
              <button
                onClick={() => setExtendModalTarget(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>
                الحجز الحالي على العقار <strong className="text-slate-900">{extendModalTarget.listingTitle}</strong> ينتهي في{' '}
                <strong className="text-slate-900 font-mono">
                  {new Date(extendModalTarget.expiresAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
                </strong>.
              </p>
              <p className="text-[11px] text-slate-400">
                الحد الأقصى الإجمالي للحجز هو 7 أيام (168 ساعة) لحماية سيولة وتداول العقارات.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الساعات الإضافية المراد زيادتها:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { h: 24, label: '+ 24 ساعة (يوم)' },
                  { h: 48, label: '+ 48 ساعة (يومان)' },
                  { h: 72, label: '+ 72 ساعة (3 أيام)' }
                ].map(opt => (
                  <button
                    key={opt.h}
                    type="button"
                    onClick={() => setExtendHours(opt.h)}
                    className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      extendHours === opt.h
                        ? 'border-[#12A889] bg-[#12A889] text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExtendModalTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isExtending}
                onClick={handleConfirmExtend}
                className="px-6 py-2 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isExtending ? 'جاري التمديد...' : 'تأكيد التمديد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CANCEL BOOKING MODAL */}
      {cancelBookingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-800 font-extrabold text-base">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>إلغاء الحجز وإعادة إتاحة العقار</span>
              </div>
              <button
                onClick={() => setCancelBookingTarget(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                أنت بصدد إلغاء الحجز المؤقت <strong className="text-slate-900">{cancelBookingTarget.bookingNumber}</strong> على العقار{' '}
                <strong className="text-slate-900">{cancelBookingTarget.listingTitle}</strong>.
              </p>
              <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                سيتم رفع القفل الحصري فوراً ويعود العقار للظهور العام للباحثين الآخرين.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                سبب الإلغاء:
              </label>
              <textarea
                value={cancelBookingReason}
                onChange={e => setCancelBookingReason(e.target.value)}
                placeholder="مثال: تعذر استكمال المعاينة أو عدم الاتفاق على بنود العقد..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-rose-500 outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelBookingTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={isCancellingBooking}
                onClick={handleConfirmCancelBooking}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isCancellingBooking ? 'جاري الإلغاء...' : 'تأكيد الإلغاء والإتاحة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
