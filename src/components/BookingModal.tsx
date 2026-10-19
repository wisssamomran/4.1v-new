import React, { useState } from 'react';
import { Listing, PropertyRequestType } from '../types';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  DollarSign,
  Phone,
  FileText,
  Lock,
  Building,
  Home,
  Check
} from 'lucide-react';

interface BookingModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  listing,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { currentUser, submitPropertyRequest, showToast } = useApp();

  const isSale = listing.purpose === 'sale';

  const [requestType, setRequestType] = useState<PropertyRequestType>('booking_intent');
  const [requestedDurationHours, setRequestedDurationHours] = useState<number>(48);
  const [preferredDate, setPreferredDate] = useState<string>('');
  const [offeredPrice, setOfferedPrice] = useState<string>('');
  const [seekerPhone, setSeekerPhone] = useState<string>(currentUser.phone || '');
  const [notes, setNotes] = useState<string>('');

  // Sale-specific state
  const [paymentMethod, setPaymentMethod] = useState<string>('نقداً بالكامل عند تحرير البصيرة');
  const [needsDeedCheck, setNeedsDeedCheck] = useState<boolean>(true);

  // Rent-specific state
  const [rentalUsageType, setRentalUsageType] = useState<string>('سكني عائلي');
  const [leaseDurationMonths, setLeaseDurationMonths] = useState<number>(12);
  const [paymentFrequency, setPaymentFrequency] = useState<string>('شهري');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isReserved = Boolean(listing.isReserved);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (currentUser.role === 'visitor') {
      showToast('يجب تسجيل الدخول أو تأكيد رقم هاتفك أولاً لتقديم الطلب', 'warning');
      return;
    }

    if (listing.advertiser.id === currentUser.id) {
      setErrorMsg('لا يمكنك تقديم طلب حجز على إعلانك الخاص');
      return;
    }

    if (!seekerPhone.trim()) {
      setErrorMsg('رقم الهاتف للتواصل مطلوب');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitPropertyRequest({
        listingId: listing.id,
        requestType,
        notes: notes.trim() + (isSale && needsDeedCheck ? ' [طلب مطابقة البصيرة الشرعية مع الأمين الشرعي]' : ''),
        offeredPrice: offeredPrice ? Number(offeredPrice) : undefined,
        preferredDate: preferredDate || undefined,
        requestedDurationHours,
        seekerPhone: seekerPhone.trim(),
        paymentMethod: isSale ? paymentMethod : undefined,
        rentalUsageType: !isSale ? rentalUsageType : undefined,
        leaseDurationMonths: !isSale ? leaseDurationMonths : undefined,
        paymentFrequency: !isSale ? paymentFrequency : undefined
      });

      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedPrice = () => {
    if (listing.currency === 'USD') return `$${listing.price.toLocaleString()}`;
    if (listing.currency === 'SAR') return `${listing.price.toLocaleString()} ر.س`;
    return `${listing.price.toLocaleString()} ر.ي`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#16324F] to-[#1a3d61] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#12A889]/20 flex items-center justify-center border border-[#12A889]/30 text-[#12A889]">
              {isSale ? <Home className="w-5 h-5 text-emerald-300" /> : <Building className="w-5 h-5 text-emerald-300" />}
            </div>
            <div>
              <h3 className="font-extrabold text-base md:text-lg">
                {isSale ? 'طلب حجز عقار للشراء' : 'طلب حجز عقار للإيجار'}
              </h3>
              <p className="text-xs text-slate-300">
                {isSale ? 'حجز مؤقت حصري لفحص وثائق الملكية والبصيرة الشرعية' : 'طلب حجز مؤقت ومعاينة وتثبيت شروط عقد الإيجار'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs md:text-sm">
          {/* Target Listing Summary Card */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3.5">
            <img
              src={listing.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=300&q=80'}
              alt={listing.title}
              className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {listing.listingNumber}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  isSale ? 'text-emerald-700 bg-emerald-50' : 'text-blue-700 bg-blue-50'
                }`}>
                  {isSale ? 'عقار للبيع' : 'عقار للإيجار'}
                </span>
                <span className="text-[11px] text-slate-500 truncate">
                  {listing.location.city} - {listing.location.district}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-xs md:text-sm truncate" title={listing.title}>
                {listing.title}
              </h4>
              <p className="text-emerald-700 font-extrabold text-xs md:text-sm mt-0.5">
                {formattedPrice()} {isSale ? '' : '/ شهرياً'}
              </p>
            </div>
          </div>

          {/* Reserved Status Alert if currently held */}
          {isReserved && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">هذا العقار محجوز مؤقتاً حالياً</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  يوجد حجز مؤقت جارٍ على هذا العقار. طلبك سيُسجل كقائمة انتظار احتياطية، وسيتاح للمعلن تأكيده في حال انتهاء مهلة الحجز القائم دون إتمام الصفقة.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs border border-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Request Type Selector */}
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">نوع الطلب:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRequestType('booking_intent')}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                    requestType === 'booking_intent'
                      ? 'border-[#12A889] bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">طلب حجز مؤقت جاد</span>
                    <Lock className={`w-3.5 h-3.5 ${requestType === 'booking_intent' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {isSale ? 'قفل حصري لفحص البصيرة الشرعية' : 'قفل حصري لمعاينة وتوقيع العقد'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRequestType('visit_inquiry')}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                    requestType === 'visit_inquiry'
                      ? 'border-[#12A889] bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">معاينة وزيارة ميدانية</span>
                    <Calendar className={`w-3.5 h-3.5 ${requestType === 'visit_inquiry' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">تحديد موعد للوقوف على العقار</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRequestType('price_offer')}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                    requestType === 'price_offer'
                      ? 'border-[#12A889] bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">تقديم عرض سعر</span>
                    <DollarSign className={`w-3.5 h-3.5 ${requestType === 'price_offer' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">اقتراح سعر تفاوضي مناسب</span>
                </button>
              </div>
            </div>

            {/* 2. DYNAMIC SECTION: SALE vs RENT SPECIFIC FIELDS */}
            {isSale ? (
              /* ================= SALE FIELDS ================= */
              <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>بيانات صفقة الشراء المعتمدة:</span>
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-bold mb-1">
                    طريقة السداد المقترحة للشراء:
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-[#12A889] outline-none"
                  >
                    <option value="نقداً بالكامل عند تحرير البصيرة">نقداً بالكامل عند تحرير البصيرة (كاش)</option>
                    <option value="دفعتين: 50% مقدم و50% عند الإفراغ والتسليم">دفعتين: 50% مقدم و50% عند الإفراغ والتسليم</option>
                    <option value="دفعات مجدولة ميسرة (أقساط متفق عليها)">دفعات مجدولة ميسرة (أقساط متفق عليها)</option>
                    <option value="شيك مصرفي مصدق معتمد">شيك مصرفي مصدق معتمد</option>
                  </select>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800 font-medium">
                    <input
                      type="checkbox"
                      checked={needsDeedCheck}
                      onChange={e => setNeedsDeedCheck(e.target.checked)}
                      className="w-4 h-4 rounded text-[#12A889] focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>أرغب بمراجعة البصيرة الشرعية وفحص الحدود مع الأمين الشرعي المعتمد</span>
                  </label>
                </div>
              </div>
            ) : (
              /* ================= RENT FIELDS ================= */
              <div className="p-3.5 bg-blue-50/40 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span>بيانات عقد الإيجار المقترح:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-slate-700 text-xs font-bold mb-1">
                      نوع الاستخدام:
                    </label>
                    <select
                      value={rentalUsageType}
                      onChange={e => setRentalUsageType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-[#12A889] outline-none"
                    >
                      <option value="سكني عائلي">سكني عائلي</option>
                      <option value="تجاري / معرض أو متجر">تجاري / معرض أو متجر</option>
                      <option value="مكتبي / مقر شركة">مكتبي / مقر شركة</option>
                      <option value="سكن طلاب / عزاب">سكن طلاب / عزاب</option>
                      <option value="خدمي / مستودع">خدمي / مستودع</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 text-xs font-bold mb-1">
                      مدة العقد المقترحة:
                    </label>
                    <select
                      value={leaseDurationMonths}
                      onChange={e => setLeaseDurationMonths(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-[#12A889] outline-none"
                    >
                      <option value={6}>6 أشهر</option>
                      <option value={12}>سنة واحدة (افتراضي)</option>
                      <option value={24}>سنتان</option>
                      <option value={36}>3 سنوات أو أكثر</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 text-xs font-bold mb-1">
                      دورية سداد الإيجار:
                    </label>
                    <select
                      value={paymentFrequency}
                      onChange={e => setPaymentFrequency(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-[#12A889] outline-none"
                    >
                      <option value="شهري">شهرياً</option>
                      <option value="ربع سنوي (كل 3 أشهر)">ربع سنوي (كل 3 أشهر)</option>
                      <option value="نصف سنوي (كل 6 أشهر)">نصف سنوي (كل 6 أشهر)</option>
                      <option value="سنوي مقدماً">سنوي مقدماً</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Duration Selector (1h to 168h max) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#12A889]" />
                  <span>مدة الحجز المؤقت المطلوبة:</span>
                </label>
                <span className="text-[11px] text-slate-500 font-mono">الحد الأقصى 7 أيام (168 ساعة)</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { hours: 24, label: '24 ساعة' },
                  { hours: 48, label: '48 ساعة (الموصى بها)' },
                  { hours: 72, label: '72 ساعة' },
                  { hours: 120, label: '5 أيام' },
                  { hours: 168, label: '7 أيام (الحد الأقصى)' }
                ].map(item => (
                  <button
                    key={item.hours}
                    type="button"
                    onClick={() => setRequestedDurationHours(item.hours)}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                      requestedDurationHours === item.hours
                        ? 'border-[#12A889] bg-[#12A889] text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Common Contact and Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  الموعد المفضل للمعاينة الميدانية:
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={e => setPreferredDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#12A889] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  رقم الهاتف المعتمد للتواصل:
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={seekerPhone}
                    onChange={e => setSeekerPhone(e.target.value)}
                    placeholder="770000000"
                    dir="ltr"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#12A889] outline-none text-right font-mono"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {requestType === 'price_offer' && (
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    السعر المقترح ({listing.currency}):
                  </label>
                  <input
                    type="number"
                    value={offeredPrice}
                    onChange={e => setOfferedPrice(e.target.value)}
                    placeholder={`مثال: ${Math.round(listing.price * 0.95)}`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#12A889] outline-none"
                  />
                </div>
              )}
            </div>

            {/* 5. Notes / Message */}
            <div>
              <label className="block font-bold text-slate-700 text-xs mb-1">
                ملاحظات أو استفسارات موجهة للمعلن:
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder={isSale ? "أرغب بفحص صك الملكية والبصيرة والتأكد من حدود الأرض..." : "أرغب بالمعاينة غداً مساءً وتحديد شروط العقد..."}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#12A889] outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Platform Trust & Policy Box */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] text-emerald-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>ضمانات الحجز المؤقت في دلنّي:</span>
              </div>
              <p>• عند قبول الطلب من المعلن، يتم قفل العقار مؤقتاً ومنع تأكيد أي حجوزات متعارضة طوال مدة الحجز.</p>
              <p>• الحجز مخصص للمعاينة ومطابقة الوثائق دون فرض أي رسوم إضافية.</p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد وإرسال الطلب</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
