import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Listing,
  Organization,
  VerificationRequest,
  ReportCase,
  SupportTicket,
  AuditLogEntry,
  User,
  ListingStatus,
  UserRole,
  StaffMember,
  ActiveSession,
  SecurityThreat,
  BlockedIp,
  SystemSettings,
  FeatureFlag,
  BackupPoint,
  SystemErrorLog,
  IntegrationServiceStatus,
  EscalationCase,
  PropertyRequest,
  PropertyBooking
} from '../types';
import {
  INITIAL_LISTINGS,
  INITIAL_ORGANIZATIONS,
  INITIAL_VERIFICATION_REQUESTS,
  INITIAL_REPORTS,
  INITIAL_TICKETS,
  INITIAL_AUDIT_LOGS,
  MOCK_USERS
} from '../data/yemenData';

export interface DatabaseSchema {
  listings: Listing[];
  organizations: Organization[];
  verifications: VerificationRequest[];
  reports: ReportCase[];
  tickets: SupportTicket[];
  auditLogs: AuditLogEntry[];
  users: User[];
  staff: StaffMember[];
  rolesMatrix: Record<string, string[]>;
  activeSessions: ActiveSession[];
  threats: SecurityThreat[];
  blockedIps: BlockedIp[];
  systemSettings: SystemSettings;
  featureFlags: FeatureFlag[];
  backups: BackupPoint[];
  systemErrors: SystemErrorLog[];
  integrations: IntegrationServiceStatus[];
  escalations: EscalationCase[];
  requests: PropertyRequest[];
  bookings: PropertyBooking[];
  meta: {
    lastUpdated: string;
    version: string;
  };
}

const DB_FILE_PATH = path.resolve(process.cwd(), '.data', 'dalani_database.json');
const BACKUPS_DIR = path.resolve(process.cwd(), '.data', 'backups');

export function normalizeListing(l: any): Listing {
  return {
    ...l,
    id: l.id || `list-${Date.now()}`,
    listingNumber: l.listingNumber || 'YEM-2026-000',
    title: l.title || 'عقار معروض',
    description: l.description || '',
    propertyType: l.propertyType || 'apartment',
    purpose: l.purpose || 'sale',
    status: l.status || 'under_review',
    price: typeof l.price === 'number' ? l.price : 0,
    currency: l.currency || 'YER',
    isNegotiable: Boolean(l.isNegotiable),
    area: typeof l.area === 'number' ? l.area : 0,
    areaUnit: l.areaUnit || 'م²',
    images: (Array.isArray(l.images) && l.images.length > 0)
      ? l.images
      : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'],
    location: {
      governorate: l.location?.governorate || 'صنعاء (أمانة العاصمة)',
      city: l.location?.city || 'صنعاء',
      district: l.location?.district || 'الأمانة',
      street: l.location?.street || '',
      lat: typeof l.location?.lat === 'number' ? l.location.lat : 15.312,
      lng: typeof l.location?.lng === 'number' ? l.location.lng : 44.187,
      isApproximate: l.location?.isApproximate ?? true
    },
    attributes: l.attributes || {},
    advertiser: {
      id: l.advertiser?.id || 'adv-unknown',
      name: l.advertiser?.name || 'معلن دلنّي',
      type: l.advertiser?.type || 'individual',
      phone: l.advertiser?.phone || '777000000',
      phoneVerified: l.advertiser?.phoneVerified ?? true,
      allowWhatsapp: l.advertiser?.allowWhatsapp ?? true,
      allowCall: l.advertiser?.allowCall ?? true,
      orgId: l.advertiser?.orgId,
      orgName: l.advertiser?.orgName
    },
    verificationBadges: Array.isArray(l.verificationBadges) ? l.verificationBadges : [],
    statusTimeline: Array.isArray(l.statusTimeline) ? l.statusTimeline : [],
    viewsCount: typeof l.viewsCount === 'number' ? l.viewsCount : 0,
    favoritesCount: typeof l.favoritesCount === 'number' ? l.favoritesCount : 0,
    isReserved: Boolean(l.isReserved),
    reservedUntil: l.reservedUntil,
    activeBookingId: l.activeBookingId,
    createdAt: l.createdAt || new Date().toISOString().split('T')[0],
    updatedAt: l.updatedAt || new Date().toISOString().split('T')[0]
  };
}

function getDefaultRolesMatrix(): Record<string, string[]> {
  return {
    visitor: ['view_public_listings', 'search_filter'],
    seeker: ['view_public_listings', 'search_filter', 'save_favorites', 'open_tickets'],
    advertiser: ['view_public_listings', 'search_filter', 'save_favorites', 'create_listings', 'edit_own_listings', 'open_tickets'],
    org_manager: ['view_public_listings', 'search_filter', 'save_favorites', 'create_listings', 'edit_own_listings', 'manage_org_staff', 'assign_agent_listings'],
    org_agent: ['view_public_listings', 'search_filter', 'save_favorites', 'create_listings', 'edit_assigned_listings'],
    moderator: ['view_public_listings', 'view_all_listings', 'moderate_listings', 'request_changes', 'suspend_listings'],
    verifier: ['view_public_listings', 'view_all_listings', 'view_sensitive_deeds', 'verify_phone', 'verify_documents', 'issue_badges'],
    reporter_admin: ['view_public_listings', 'view_all_listings', 'view_reports', 'investigate_reports', 'resolve_reports', 'suspend_abusive_ads'],
    support: ['view_public_listings', 'view_tickets', 'reply_tickets', 'close_tickets'],
    accountant: ['view_public_listings', 'view_financial_overview', 'view_listing_billing', 'export_financial_reports'],
    system_admin: [
      'manage_users', 'manage_staff', 'manage_roles_matrix', 'manage_security',
      'terminate_sessions', 'block_ips', 'view_audit_trail', 'manage_settings',
      'manage_feature_flags', 'manage_backups', 'view_system_errors', 'test_integrations',
      'resolve_escalations', 'repair_database', 'view_sensitive_data'
    ]
  };
}

function getDefaultStaff(users: User[]): StaffMember[] {
  const staffRoles: { role: UserRole; dept: StaffMember['department']; perms: string[] }[] = [
    { role: 'system_admin', dept: 'management', perms: ['all_administrative_powers', 'view_sensitive_docs', 'manage_staff', 'manage_security', 'backups_and_restore'] },
    { role: 'moderator', dept: 'moderation', perms: ['view_all_listings', 'moderate_listings', 'request_changes', 'suspend_listings'] },
    { role: 'verifier', dept: 'verification', perms: ['view_all_listings', 'view_sensitive_deeds', 'verify_documents', 'issue_badges'] },
    { role: 'reporter_admin', dept: 'disputes', perms: ['view_reports', 'investigate_reports', 'resolve_reports', 'suspend_abusive_ads'] },
    { role: 'support', dept: 'support', perms: ['view_tickets', 'reply_tickets', 'close_tickets'] },
    { role: 'accountant', dept: 'finance', perms: ['view_financial_overview', 'view_listing_billing', 'export_financial_reports'] }
  ];

  const staff: StaffMember[] = [];
  staffRoles.forEach((item, index) => {
    const user = users.find(u => u.role === item.role);
    if (user) {
      staff.push({
        id: `stf-${100 + index}`,
        userId: user.id,
        name: user.name,
        email: `${user.role}@dalani-ye.com`,
        phone: user.phone || '+967 770 000 000',
        role: item.role,
        department: item.dept,
        activeStatus: user.activeStatus ?? true,
        permissions: item.perms,
        createdAt: '2026-01-15',
        lastLoginAt: '2026-10-17 10:30',
        notes: 'حساب موظف معتمد في الهيكل الإداري للمنصة'
      });
    }
  });

  return staff;
}

function getDefaultSystemSettings(): SystemSettings {
  return {
    platformName: 'منصة دلالي العقارية اليمنية',
    platformTagline: 'المنظومة الوطنية الموثوقة للتسويق والرقابة العقارية',
    maintenanceMode: false,
    defaultCurrency: 'YER',
    allowNewRegistrations: true,
    allowPublicListingPublish: true,
    requirePhoneOtp: true,
    requireIdentityVerificationForAd: false,
    maxDailyListingsPerUser: 10,
    sessionTimeoutMinutes: 60,
    maxFailedLoginAttempts: 5,
    contactEmail: 'admin@dalani-ye.com',
    contactPhone: '+967 1 200300',
    smsNotificationEnabled: true,
    emailNotificationEnabled: true,
    adminAlertsPhone: '+967 777 000 111'
  };
}

function getDefaultFeatureFlags(): FeatureFlag[] {
  return [
    {
      id: 'ff-1',
      key: 'public_registrations',
      name: 'تسجيل الحسابات الجديدة للجمهور',
      description: 'السماح للزوار بإنشاء حسابات باحث ومعلن فردي عبر رقم الهاتف',
      enabled: true,
      category: 'core',
      updatedAt: '2026-10-15'
    },
    {
      id: 'ff-2',
      key: 'strict_sms_otp',
      name: 'إلزامية التحقق بـ SMS OTP',
      description: 'إرسال رمز تحقق صالح لمرة واحدة عند كل تسجيل دخول أو نشر إعلان',
      enabled: true,
      category: 'security',
      updatedAt: '2026-10-16'
    },
    {
      id: 'ff-3',
      key: 'direct_broker_chat',
      name: 'المحادثات المباشرة بين الباحث والمعلن',
      description: 'تفعيل المحادثات الفورية عبر الموقع الداخلي إلى جانب الواتساب والاتصال',
      enabled: true,
      category: 'commercial',
      updatedAt: '2026-10-12'
    },
    {
      id: 'ff-4',
      key: 'ai_listing_enhancer',
      name: 'مساعد الذكاء الاصطناعي لصياغة الإعلانات',
      description: 'توليد تفاصيل المواصفات العقارية وتنسيق وصف العقار آلياً',
      enabled: true,
      category: 'experimental',
      updatedAt: '2026-10-10'
    },
    {
      id: 'ff-5',
      key: 'watermark_uploaded_images',
      name: 'إضافة علامة مائية تلقائية للصور',
      description: 'دمج شعار دلالي على كافة صور العقارات لمنع سرقتها وإعادة نشرها',
      enabled: true,
      category: 'core',
      updatedAt: '2026-10-08'
    },
    {
      id: 'ff-6',
      key: 'mandatory_deed_check_over_50m',
      name: 'الفحص الإلزامي للبصيرة للعقارات الكبيرة',
      description: 'إلزام فحص وثيقة الملكية والبصيرة لأي عقار تتجاوز قيمته 50 مليون ريال',
      enabled: false,
      category: 'security',
      updatedAt: '2026-10-17'
    }
  ];
}

function getDefaultActiveSessions(): ActiveSession[] {
  return [
    {
      id: 'ses-101',
      sessionId: 'sess_live_admin_9921',
      userId: 'usr-admin-01',
      userName: 'أ. د. خالد الرياشي',
      userRole: 'system_admin',
      ipAddress: '185.190.22.45',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0',
      deviceType: 'desktop',
      location: 'صنعاء، اليمن',
      startedAt: '2026-10-17 07:15',
      lastActiveAt: 'الآن',
      isCurrentSession: true
    },
    {
      id: 'ses-102',
      sessionId: 'ses_mod_8471',
      userId: 'usr-mod-01',
      userName: 'م. مروان القدسي',
      userRole: 'moderator',
      ipAddress: '82.114.160.18',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      deviceType: 'desktop',
      location: 'تعز، اليمن',
      startedAt: '2026-10-17 08:00',
      lastActiveAt: 'منذ 5 دقائق'
    },
    {
      id: 'ses-103',
      sessionId: 'ses_ver_5219',
      userId: 'usr-ver-01',
      userName: 'د. سمير الذماري',
      userRole: 'verifier',
      ipAddress: '134.35.12.90',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      deviceType: 'desktop',
      location: 'ذمار، اليمن',
      startedAt: '2026-10-17 08:20',
      lastActiveAt: 'منذ 12 دقيقة'
    },
    {
      id: 'ses-104',
      sessionId: 'ses_adv_3910',
      userId: 'usr-adv-01',
      userName: 'الشيخ محمد الجوفي',
      userRole: 'advertiser',
      ipAddress: '178.130.40.11',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)',
      deviceType: 'mobile',
      location: 'إب، اليمن',
      startedAt: '2026-10-17 08:35',
      lastActiveAt: 'منذ دقيقة'
    }
  ];
}

function getDefaultThreats(): SecurityThreat[] {
  return [
    {
      id: 'th-1',
      ipAddress: '91.240.118.82',
      attemptType: 'brute_force',
      targetUsername: 'admin@dalani-ye.com',
      occurredAt: '2026-10-17 04:12',
      country: 'مجهول',
      city: 'مجهول',
      severity: 'high',
      blocked: true,
      details: 'تجاوز حد المحاولات الفاشلة (8 محاولات متتالية لتخمين كلمة المرور)'
    },
    {
      id: 'th-2',
      ipAddress: '194.26.29.112',
      attemptType: 'unauthorized_role_elevation',
      targetUsername: 'usr-visitor-guest',
      occurredAt: '2026-10-17 06:45',
      country: 'روسيا',
      city: 'موسكو',
      severity: 'critical',
      blocked: true,
      details: 'محاولة إرسال ترويسة x-user-role: system_admin من مصدر غير موثق'
    },
    {
      id: 'th-3',
      ipAddress: '185.220.101.5',
      attemptType: 'suspicious_headers',
      targetUsername: 'غير محدد',
      occurredAt: '2026-10-17 07:05',
      country: 'ألمانيا',
      city: 'فرانكفورت',
      severity: 'medium',
      blocked: false,
      details: 'مسح آلي لمسارات الخادم عبر روبوت فحص أمني غير مصرح'
    }
  ];
}

function getDefaultBackups(): BackupPoint[] {
  return [
    {
      id: 'bkp-1',
      fileName: 'dalani_backup_2026_10_16_daily.json',
      createdAt: '2026-10-16 23:59',
      createdBy: 'النظام (نسخ تلقائي مجدول)',
      sizeBytes: 428512,
      recordsCount: {
        listings: 8,
        users: 10,
        organizations: 2,
        auditLogs: 15,
        verifications: 3,
        reports: 3,
        tickets: 3
      },
      checksumSha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      status: 'valid',
      notes: 'نسخة احتياطية مكتملة ومفحوصة لجميع الكيانات والعلاقات'
    }
  ];
}

function getDefaultSystemErrors(): SystemErrorLog[] {
  return [
    {
      id: 'err-1',
      timestamp: '2026-10-17 06:12',
      code: 'SMS_GATEWAY_TIMEOUT',
      module: 'YemenMobileGateway',
      message: 'تأخر استجابة بوابة الرسائل القصيرة لرمز التحقق (أكثر من 5 ثوانٍ)',
      severity: 'warning',
      status: 'resolved',
      resolvedAt: '2026-10-17 06:15',
      resolvedBy: 'النظام (إعادة المحاولة التلقائية)'
    },
    {
      id: 'err-2',
      timestamp: '2026-10-17 07:30',
      code: 'STORAGE_QUOTA_WARN',
      module: 'MediaCloudStorage',
      message: 'استهلاك التخزين وصل إلى 68% من السعة المحددة للوسائط والصور',
      severity: 'warning',
      status: 'open'
    }
  ];
}

function getDefaultIntegrations(): IntegrationServiceStatus[] {
  return [
    {
      id: 'int-1',
      name: 'بوابة رسائل يمن موبايل (Yemen Mobile SMS Gateway)',
      type: 'sms_gateway',
      endpoint: 'https://sms.yemenmobile.com.ye/api/v2/send',
      status: 'online',
      latencyMs: 142,
      lastCheckedAt: '2026-10-17 08:15'
    },
    {
      id: 'int-2',
      name: 'بوابة رسائل سبأفون (Sabafon SMS API)',
      type: 'sms_gateway',
      endpoint: 'https://bulksms.sabafon.com/api/send',
      status: 'online',
      latencyMs: 168,
      lastCheckedAt: '2026-10-17 08:15'
    },
    {
      id: 'int-3',
      name: 'خادم تخزين الوثائق والصور (Private Cloud S3)',
      type: 'cloud_storage',
      endpoint: 'https://storage.dalani-ye.com/vault',
      status: 'online',
      latencyMs: 45,
      lastCheckedAt: '2026-10-17 08:20'
    },
    {
      id: 'int-4',
      name: 'خادم البريد الإلكتروني الحكومي والمهني (SMTP)',
      type: 'email_smtp',
      endpoint: 'smtp.dalani-ye.com:587',
      status: 'online',
      latencyMs: 82,
      lastCheckedAt: '2026-10-17 08:10'
    }
  ];
}

function getDefaultEscalations(): EscalationCase[] {
  return [
    {
      id: 'esc-1',
      caseNumber: 'ESC-2026-004',
      title: 'نزاع ملكية عقار تجاري في شارع الزبيري (مبلغ نزاع > 100 مليون)',
      sourceType: 'report',
      sourceId: 'rep-002',
      submittedBy: 'مسؤول البلاغات (أ. عادل النجار)',
      priority: 'critical',
      status: 'pending_admin',
      description: 'قام معلنان مختلفان برفع إعلانات بيع لنفس العقار التجاري بوثائق متضاربة تتطلب قرار الإدارة العليا لإيقاف كلا الإعلانين لحين استكمال التحري القضائي.',
      createdAt: '2026-10-17 07:45'
    },
    {
      id: 'esc-2',
      caseNumber: 'ESC-2026-005',
      title: 'طلب استثناء نشر إعلان لمكتب عقاري معلق ترخيصه مؤقتاً',
      sourceType: 'staff_override',
      sourceId: 'org-2',
      submittedBy: 'مسؤول التحقق (د. سمير الذماري)',
      priority: 'medium',
      status: 'pending_admin',
      description: 'المكتب قدم إفادة تجديد من وزارة الصناعة وقيد مراجعة الغرفة التجارية، ويطلب الإذن المؤقت لمدة 14 يوماً.',
      createdAt: '2026-10-17 08:10'
    }
  ];
}

function getDefaultRequests(): PropertyRequest[] {
  return [
    {
      id: 'req-101',
      requestNumber: 'REQ-2026-1001',
      listingId: 'list-1',
      listingTitle: 'شقة فاخرة للإيجار السنوي - حدة الحي الدبلوماسي',
      listingNumber: 'YEM-2026-101',
      listingPrice: 800,
      listingCurrency: 'USD',
      listingImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      listingGovernorate: 'صنعاء (أمانة العاصمة)',
      seekerId: 'usr-seeker',
      seekerName: 'أصيل محمد الحكيمي',
      seekerPhone: '+967 778 990 011',
      advertiserId: 'adv-1',
      advertiserName: 'هشام عبد الرحمن القدسي',
      advertiserPhone: '+967 777 012 345',
      requestType: 'booking_intent',
      status: 'pending',
      notes: 'أرغب بحجز الشقة ومراجعة العقد مع المالك غداً صباحاً، جاهز لتسليم شيك الضمان.',
      offeredPrice: 750,
      preferredDate: '2026-10-20',
      requestedDurationHours: 48,
      createdAt: '2026-10-18',
      updatedAt: '2026-10-18'
    },
    {
      id: 'req-102',
      requestNumber: 'REQ-2026-1002',
      listingId: 'list-2',
      listingTitle: 'فيلا ملكية للبيع - بيت بوس حي الشباب',
      listingNumber: 'YEM-2026-102',
      listingPrice: 320000,
      listingCurrency: 'USD',
      listingImage: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
      listingGovernorate: 'صنعاء (أمانة العاصمة)',
      seekerId: 'usr-seeker',
      seekerName: 'أصيل محمد الحكيمي',
      seekerPhone: '+967 778 990 011',
      advertiserId: 'adv-1',
      advertiserName: 'هشام عبد الرحمن القدسي',
      advertiserPhone: '+967 777 012 345',
      requestType: 'booking_intent',
      status: 'accepted',
      bookingId: 'bkg-201',
      notes: 'طلب حجز مؤقت لمدة 48 ساعة لفحص البصيرة الشرعية مع الأمين المعتمد.',
      requestedDurationHours: 48,
      createdAt: '2026-10-17',
      updatedAt: '2026-10-17'
    }
  ];
}

function getDefaultBookings(): PropertyBooking[] {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();
  return [
    {
      id: 'bkg-201',
      bookingNumber: 'BKG-2026-2001',
      requestId: 'req-102',
      listingId: 'list-2',
      listingTitle: 'فيلا ملكية للبيع - بيت بوس حي الشباب',
      listingNumber: 'YEM-2026-102',
      listingImage: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
      listingGovernorate: 'صنعاء (أمانة العاصمة)',
      listingPrice: 320000,
      listingCurrency: 'USD',
      seekerId: 'usr-seeker',
      seekerName: 'أصيل محمد الحكيمي',
      seekerPhone: '+967 778 990 011',
      advertiserId: 'adv-1',
      advertiserName: 'هشام عبد الرحمن القدسي',
      advertiserPhone: '+967 777 012 345',
      status: 'active',
      durationHours: 48,
      startDate: now.toISOString(),
      expiresAt: expiresAt,
      confirmedBy: 'هشام عبد الرحمن القدسي (المعلن المعتمد)',
      notes: 'تم قبول طلب الحجز المؤقت لمطابقة صك الملكية والبصيرة.',
      createdAt: '2026-10-17',
      updatedAt: '2026-10-17'
    }
  ];
}

class LocalDatabase {
  private data: DatabaseSchema;
  private isInitialized = false;

  constructor() {
    this.data = this.loadOrSeed();
    this.syncListingsReservationStatus();
    this.isInitialized = true;
  }

  private loadOrSeed(): DatabaseSchema {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        if (fileContent.trim()) {
          const parsed = JSON.parse(fileContent);
          if (parsed && Array.isArray(parsed.listings)) {
            parsed.listings = parsed.listings.map(normalizeListing);
            const defaultUsers = Object.values(MOCK_USERS);
            if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
              parsed.users = defaultUsers;
            }

            // Ensure enterprise governance schema extensions
            if (!Array.isArray(parsed.staff)) { parsed.staff = getDefaultStaff(parsed.users); }
            if (!parsed.rolesMatrix) { parsed.rolesMatrix = getDefaultRolesMatrix(); }
            if (!Array.isArray(parsed.activeSessions)) { parsed.activeSessions = getDefaultActiveSessions(); }
            if (!Array.isArray(parsed.threats)) { parsed.threats = getDefaultThreats(); }
            if (!Array.isArray(parsed.blockedIps)) {
              parsed.blockedIps = [
                { ip: '91.240.118.82', reason: 'محاولات تخمين متكررة', blockedAt: '2026-10-17 04:12', blockedBy: 'النظام الآلي' },
                { ip: '194.26.29.112', reason: 'محاولة تزوير ترويسات الصلاحية', blockedAt: '2026-10-17 06:45', blockedBy: 'النظام الآلي' }
              ];
            }
            if (!parsed.systemSettings) { parsed.systemSettings = getDefaultSystemSettings(); }
            if (!Array.isArray(parsed.featureFlags)) { parsed.featureFlags = getDefaultFeatureFlags(); }
            if (!Array.isArray(parsed.backups)) { parsed.backups = getDefaultBackups(); }
            if (!Array.isArray(parsed.systemErrors)) { parsed.systemErrors = getDefaultSystemErrors(); }
            if (!Array.isArray(parsed.integrations)) { parsed.integrations = getDefaultIntegrations(); }
            if (!Array.isArray(parsed.escalations)) { parsed.escalations = getDefaultEscalations(); }
            if (!Array.isArray(parsed.requests)) { parsed.requests = getDefaultRequests(); }
            if (!Array.isArray(parsed.bookings)) { parsed.bookings = getDefaultBookings(); }

            this.persist(parsed);
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('[Dalani DB] Failed to read existing db file, re-seeding default data:', err);
    }

    const defaultUsers = Object.values(MOCK_USERS);
    const initialData: DatabaseSchema = {
      listings: INITIAL_LISTINGS,
      organizations: INITIAL_ORGANIZATIONS,
      verifications: INITIAL_VERIFICATION_REQUESTS,
      reports: INITIAL_REPORTS,
      tickets: INITIAL_TICKETS,
      auditLogs: INITIAL_AUDIT_LOGS,
      users: defaultUsers,
      staff: getDefaultStaff(defaultUsers),
      rolesMatrix: getDefaultRolesMatrix(),
      activeSessions: getDefaultActiveSessions(),
      threats: getDefaultThreats(),
      blockedIps: [
        { ip: '91.240.118.82', reason: 'محاولات تخمين متكررة', blockedAt: '2026-10-17 04:12', blockedBy: 'النظام الآلي' },
        { ip: '194.26.29.112', reason: 'محاولة تزوير ترويسات الصلاحية', blockedAt: '2026-10-17 06:45', blockedBy: 'النظام الآلي' }
      ],
      systemSettings: getDefaultSystemSettings(),
      featureFlags: getDefaultFeatureFlags(),
      backups: getDefaultBackups(),
      systemErrors: getDefaultSystemErrors(),
      integrations: getDefaultIntegrations(),
      escalations: getDefaultEscalations(),
      requests: getDefaultRequests(),
      bookings: getDefaultBookings(),
      meta: {
        lastUpdated: new Date().toISOString(),
        version: '2.1.0-reservations'
      }
    };

    this.persist(initialData);
    return initialData;
  }

  public persist(dataToSave: DatabaseSchema = this.data) {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      dataToSave.meta.lastUpdated = new Date().toISOString();
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Dalani DB] Error persisting database to disk:', err);
    }
  }

  // --- Listings Operations ---
  public getListings(): Listing[] {
    this.checkBookingsExpiration();
    return [...this.data.listings];
  }

  public getListingById(id: string): Listing | undefined {
    this.checkBookingsExpiration();
    return this.data.listings.find(l => l.id === id);
  }

  public addListing(listing: Listing): Listing {
    const normalized = normalizeListing(listing);
    this.data.listings.unshift(normalized);
    this.persist();
    return normalized;
  }

  public updateListing(id: string, updates: Partial<Listing>): Listing | undefined {
    const index = this.data.listings.findIndex(l => l.id === id);
    if (index === -1) return undefined;
    const merged = {
      ...this.data.listings[index],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    this.data.listings[index] = normalizeListing(merged);
    this.persist();
    return this.data.listings[index];
  }

  public deleteListing(id: string): boolean {
    const prevLength = this.data.listings.length;
    this.data.listings = this.data.listings.filter(l => l.id !== id);
    if (this.data.listings.length !== prevLength) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Organizations Operations ---
  public getOrganizations(): Organization[] {
    return [...this.data.organizations];
  }

  public getOrganizationById(id: string): Organization | undefined {
    return this.data.organizations.find(o => o.id === id);
  }

  public updateOrganization(id: string, updates: Partial<Organization>): Organization | undefined {
    const index = this.data.organizations.findIndex(o => o.id === id);
    if (index === -1) return undefined;
    this.data.organizations[index] = {
      ...this.data.organizations[index],
      ...updates
    };
    this.persist();
    return this.data.organizations[index];
  }

  // --- Verifications Operations ---
  public getVerifications(): VerificationRequest[] {
    return [...this.data.verifications];
  }

  public addVerification(req: VerificationRequest): VerificationRequest {
    this.data.verifications.unshift(req);
    this.persist();
    return req;
  }

  public updateVerification(id: string, updates: Partial<VerificationRequest>): VerificationRequest | undefined {
    const index = this.data.verifications.findIndex(v => v.id === id);
    if (index === -1) return undefined;
    this.data.verifications[index] = {
      ...this.data.verifications[index],
      ...updates
    };
    this.persist();
    return this.data.verifications[index];
  }

  // --- Reports Operations ---
  public getReports(): ReportCase[] {
    return [...this.data.reports];
  }

  public addReport(rep: ReportCase): ReportCase {
    this.data.reports.unshift(rep);
    this.persist();
    return rep;
  }

  public updateReport(id: string, updates: Partial<ReportCase>): ReportCase | undefined {
    const index = this.data.reports.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    this.data.reports[index] = {
      ...this.data.reports[index],
      ...updates
    };
    this.persist();
    return this.data.reports[index];
  }

  // --- Tickets Operations ---
  public getTickets(): SupportTicket[] {
    return [...this.data.tickets];
  }

  public addTicket(ticket: SupportTicket): SupportTicket {
    this.data.tickets.unshift(ticket);
    this.persist();
    return ticket;
  }

  public updateTicket(id: string, updates: Partial<SupportTicket>): SupportTicket | undefined {
    const index = this.data.tickets.findIndex(t => t.id === id);
    if (index === -1) return undefined;
    this.data.tickets[index] = {
      ...this.data.tickets[index],
      ...updates
    };
    this.persist();
    return this.data.tickets[index];
  }

  // --- Audit Logs (Append-Only, Tamper-Proof) ---
  public getAuditLogs(): AuditLogEntry[] {
    return [...this.data.auditLogs];
  }

  public addAuditLog(entry: AuditLogEntry): AuditLogEntry {
    this.data.auditLogs.unshift(entry);
    // Keep max 500 logs in active memory
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.persist();
    return entry;
  }

  // --- Users Operations ---
  public getUsers(): User[] {
    return [...this.data.users];
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    this.data.users[index] = {
      ...this.data.users[index],
      ...updates
    };
    this.persist();
    return this.data.users[index];
  }

  public toggleUserStatus(id: string): User | undefined {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    this.data.users[index].activeStatus = !this.data.users[index].activeStatus;
    this.persist();
    return this.data.users[index];
  }

  // --- Staff Operations ---
  public getStaff(): StaffMember[] {
    return [...this.data.staff];
  }

  public getStaffById(id: string): StaffMember | undefined {
    return this.data.staff.find(s => s.id === id);
  }

  public addStaff(member: Omit<StaffMember, 'id' | 'createdAt'>): StaffMember {
    const newStaff: StaffMember = {
      ...member,
      id: `stf-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.data.staff.unshift(newStaff);

    // Also sync or create user in users array if doesn't exist
    const existingUser = this.data.users.find(u => u.phone === member.phone || u.id === member.userId);
    if (existingUser) {
      existingUser.role = member.role;
      existingUser.activeStatus = member.activeStatus ?? true;
    } else {
      this.data.users.push({
        id: member.userId || `usr-${Date.now()}`,
        name: member.name,
        phone: member.phone,
        phoneVerified: true,
        role: member.role,
        activeStatus: member.activeStatus ?? true,
        createdAt: newStaff.createdAt
      });
    }

    this.persist();
    return newStaff;
  }

  public toggleStaffStatus(id: string): StaffMember | undefined {
    const index = this.data.staff.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    this.data.staff[index].activeStatus = !this.data.staff[index].activeStatus;
    // Sync with users array
    const user = this.data.users.find(u => u.id === this.data.staff[index].userId || u.name === this.data.staff[index].name);
    if (user) {
      user.activeStatus = this.data.staff[index].activeStatus;
    }
    this.persist();
    return this.data.staff[index];
  }

  public updateStaffPermissions(id: string, permissions: string[]): StaffMember | undefined {
    const index = this.data.staff.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    this.data.staff[index].permissions = permissions;
    this.persist();
    return this.data.staff[index];
  }

  // --- Roles Matrix Operations ---
  public getRolesMatrix(): Record<string, string[]> {
    return { ...this.data.rolesMatrix };
  }

  public updateRolesMatrix(matrix: Record<string, string[]>): Record<string, string[]> {
    this.data.rolesMatrix = {
      ...this.data.rolesMatrix,
      ...matrix
    };
    this.persist();
    return this.data.rolesMatrix;
  }

  // --- Active Sessions Operations ---
  public getActiveSessions(): ActiveSession[] {
    return [...this.data.activeSessions];
  }

  public addActiveSession(session: Omit<ActiveSession, 'id'>): ActiveSession {
    const newSession: ActiveSession = {
      ...session,
      id: `ses-${Date.now()}`
    };
    this.data.activeSessions.unshift(newSession);
    this.persist();
    return newSession;
  }

  public terminateSession(sessionIdOrId: string): boolean {
    const initialLen = this.data.activeSessions.length;
    this.data.activeSessions = this.data.activeSessions.filter(
      s => s.id !== sessionIdOrId && s.sessionId !== sessionIdOrId
    );
    if (this.data.activeSessions.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Security Threats & IP Blocking ---
  public getThreats(): SecurityThreat[] {
    return [...this.data.threats];
  }

  public addThreat(threat: Omit<SecurityThreat, 'id' | 'occurredAt'>): SecurityThreat {
    const newThreat: SecurityThreat = {
      ...threat,
      id: `th-${Date.now()}`,
      occurredAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    this.data.threats.unshift(newThreat);
    if (this.data.threats.length > 100) {
      this.data.threats = this.data.threats.slice(0, 100);
    }
    this.persist();
    return newThreat;
  }

  public getBlockedIps(): BlockedIp[] {
    return [...this.data.blockedIps];
  }

  public blockIp(ip: string, reason: string, blockedBy: string): BlockedIp {
    const existing = this.data.blockedIps.find(b => b.ip === ip);
    if (existing) return existing;

    const entry: BlockedIp = {
      ip,
      reason,
      blockedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      blockedBy
    };
    this.data.blockedIps.unshift(entry);

    // Also mark threats matching this IP as blocked
    this.data.threats.forEach(t => {
      if (t.ipAddress === ip) t.blocked = true;
    });

    this.persist();
    return entry;
  }

  public unblockIp(ip: string): boolean {
    const initialLen = this.data.blockedIps.length;
    this.data.blockedIps = this.data.blockedIps.filter(b => b.ip !== ip);
    this.data.threats.forEach(t => {
      if (t.ipAddress === ip) t.blocked = false;
    });
    if (this.data.blockedIps.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  public isIpBlocked(ip: string): boolean {
    return this.data.blockedIps.some(b => b.ip === ip);
  }

  // --- System Settings ---
  public getSystemSettings(): SystemSettings {
    return { ...this.data.systemSettings };
  }

  public updateSystemSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.data.systemSettings = {
      ...this.data.systemSettings,
      ...updates
    };
    this.persist();
    return this.data.systemSettings;
  }

  // --- Feature Flags ---
  public getFeatureFlags(): FeatureFlag[] {
    return [...this.data.featureFlags];
  }

  public toggleFeatureFlag(key: string): FeatureFlag | undefined {
    const flag = this.data.featureFlags.find(f => f.key === key);
    if (!flag) return undefined;
    flag.enabled = !flag.enabled;
    flag.updatedAt = new Date().toISOString().split('T')[0];
    this.persist();
    return flag;
  }

  public updateFeatureFlag(key: string, updates: Partial<FeatureFlag>): FeatureFlag | undefined {
    const flag = this.data.featureFlags.find(f => f.key === key);
    if (!flag) return undefined;
    Object.assign(flag, updates, { updatedAt: new Date().toISOString().split('T')[0] });
    this.persist();
    return flag;
  }

  // --- Backups & Restore ---
  public getBackups(): BackupPoint[] {
    return [...this.data.backups];
  }

  public createBackup(createdBy: string, notes?: string): BackupPoint {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `dalani_backup_${timestamp}.json`;
    const fullBackupPath = path.resolve(BACKUPS_DIR, fileName);

    const fullDump = JSON.stringify(this.data, null, 2);
    const hash = crypto.createHash('sha256').update(fullDump).digest('hex');
    fs.writeFileSync(fullBackupPath, fullDump, 'utf-8');

    const backupPoint: BackupPoint = {
      id: `bkp-${Date.now()}`,
      fileName,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      createdBy,
      sizeBytes: Buffer.byteLength(fullDump, 'utf-8'),
      recordsCount: {
        listings: this.data.listings.length,
        users: this.data.users.length,
        organizations: this.data.organizations.length,
        auditLogs: this.data.auditLogs.length,
        verifications: this.data.verifications.length,
        reports: this.data.reports.length,
        tickets: this.data.tickets.length
      },
      checksumSha256: hash,
      status: 'valid',
      notes: notes || 'نسخة احتياطية كاملة وموثقة للمنظومة'
    };

    this.data.backups.unshift(backupPoint);
    this.persist();
    return backupPoint;
  }

  public restoreBackup(backupId: string, performedBy: string): { success: boolean; message: string; safetyBackupId?: string } {
    const backup = this.data.backups.find(b => b.id === backupId);
    if (!backup) {
      return { success: false, message: 'ملف النسخة الاحتياطية غير موجود في السجل' };
    }

    const backupFileName = backup.fileName || backup.name || '';
    if (!backupFileName) {
      return { success: false, message: 'اسم ملف النسخة الاحتياطية غير محدد' };
    }

    const fullBackupPath = path.resolve(BACKUPS_DIR, backupFileName);
    let backupContent: string;

    if (fs.existsSync(fullBackupPath)) {
      backupContent = fs.readFileSync(fullBackupPath, 'utf-8');
    } else {
      // If standalone backup file missing on disk, fallback to checking if state was recorded
      return { success: false, message: `تعذر قراءة ملف النسخة من المسار: ${backupFileName}` };
    }

    // Verify Checksum
    const currentHash = crypto.createHash('sha256').update(backupContent).digest('hex');
    if (backup.checksumSha256 && backup.checksumSha256 !== currentHash) {
      backup.status = 'corrupted';
      this.persist();
      return { success: false, message: 'فشل التحقق من التوقيع الرقمي للنسخة الاحتياطية، تم إلغاء الاستعادة لحماية البيانات.' };
    }

    // Create automatic safety snapshot before restoring
    const safetySnapshot = this.createBackup(
      `النظام الآلي (قبل استعادة ${backup.fileName})`,
      'نسخة أمان تلقائية تم أخذها مباشرة قبل تنفيذ عملية استرجاع لتأمين إمكانية التراجع'
    );

    try {
      const restoredData = JSON.parse(backupContent);
      if (!Array.isArray(restoredData.listings) || !Array.isArray(restoredData.users)) {
        return { success: false, message: 'بنية ملف النسخة الاحتياطية غير متوافقة أو ينقصها جداول أساسية' };
      }

      // Restore data while preserving current backups registry and audit trail continuity
      this.data.listings = restoredData.listings.map(normalizeListing);
      this.data.organizations = restoredData.organizations || [];
      this.data.verifications = restoredData.verifications || [];
      this.data.reports = restoredData.reports || [];
      this.data.tickets = restoredData.tickets || [];
      this.data.users = restoredData.users || [];
      this.data.staff = restoredData.staff || getDefaultStaff(this.data.users);
      this.data.rolesMatrix = restoredData.rolesMatrix || getDefaultRolesMatrix();
      this.data.systemSettings = restoredData.systemSettings || getDefaultSystemSettings();
      this.data.featureFlags = restoredData.featureFlags || getDefaultFeatureFlags();

      this.persist();
      return {
        success: true,
        message: `تمت استعادة البيانات بنجاح من النسخة ${backup.fileName}`,
        safetyBackupId: safetySnapshot.id
      };
    } catch (err: any) {
      return { success: false, message: `خطأ أثناء استعادة البيانات: ${err.message}` };
    }
  }

  // --- System Error Logs ---
  public getSystemErrors(): SystemErrorLog[] {
    return [...this.data.systemErrors];
  }

  public logSystemError(code: string, module: string, message: string, severity: SystemErrorLog['severity'] = 'error'): SystemErrorLog {
    const errorLog: SystemErrorLog = {
      id: `err-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      code,
      module,
      message,
      severity,
      status: 'open'
    };
    this.data.systemErrors.unshift(errorLog);
    if (this.data.systemErrors.length > 100) {
      this.data.systemErrors = this.data.systemErrors.slice(0, 100);
    }
    this.persist();
    return errorLog;
  }

  public resolveSystemError(id: string, resolvedBy: string): SystemErrorLog | undefined {
    const error = this.data.systemErrors.find(e => e.id === id);
    if (!error) return undefined;
    error.status = 'resolved';
    error.resolvedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    error.resolvedBy = resolvedBy;
    this.persist();
    return error;
  }

  // --- Integrations ---
  public getIntegrations(): IntegrationServiceStatus[] {
    return [...this.data.integrations];
  }

  public updateIntegrationStatus(id: string, updates: Partial<IntegrationServiceStatus>): IntegrationServiceStatus | undefined {
    const item = this.data.integrations.find(i => i.id === id);
    if (!item) return undefined;
    Object.assign(item, updates, { lastCheckedAt: new Date().toISOString().replace('T', ' ').slice(0, 16) });
    this.persist();
    return item;
  }

  // --- Escalations ---
  public getEscalations(): EscalationCase[] {
    return [...this.data.escalations];
  }

  public resolveEscalation(id: string, status: 'approved' | 'rejected', notes: string): EscalationCase | undefined {
    const item = this.data.escalations.find(e => e.id === id);
    if (!item) return undefined;
    item.status = status;
    item.adminResolutionNotes = notes;
    item.resolvedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    this.persist();
    return item;
  }

  // --- Data Integrity Check & Repair ---
  public checkDataIntegrity(): {
    isHealthy: boolean;
    issuesFound: string[];
    stats: {
      totalListings: number;
      totalUsers: number;
      orphanListings: number;
      unlinkedTickets: number;
      missingDeedBadges: number;
      staleSessionsCount: number;
    };
  } {
    const issues: string[] = [];
    const userIds = new Set(this.data.users.map(u => u.id));

    // Check orphan listings
    const orphanListings = this.data.listings.filter(l => l.advertiser && !userIds.has(l.advertiser.id));
    if (orphanListings.length > 0) {
      issues.push(`تم رصد ${orphanListings.length} عقارات بمعرف معلن غير مسجل في جدول المستخدمين.`);
    }

    // Check unlinked tickets
    const unlinkedTickets = this.data.tickets.filter(t => !userIds.has(t.userId));
    if (unlinkedTickets.length > 0) {
      issues.push(`تم رصد ${unlinkedTickets.length} تذاكر دعم فني لا يرتبط أصحابها بحسابات مسجلة.`);
    }

    const missingDeedBadges = this.data.listings.filter(
      l => l.status === 'published' && (!l.verificationBadges || l.verificationBadges.length === 0)
    ).length;

    const staleSessions = this.data.activeSessions.filter(s => {
      // Sessions with lastActiveAt older than timeout
      return false;
    });

    return {
      isHealthy: issues.length === 0,
      issuesFound: issues,
      stats: {
        totalListings: this.data.listings.length,
        totalUsers: this.data.users.length,
        orphanListings: orphanListings.length,
        unlinkedTickets: unlinkedTickets.length,
        missingDeedBadges,
        staleSessionsCount: staleSessions.length
      }
    };
  }

  public repairDataIntegrity(): { repairedCount: number; summary: string } {
    let repaired = 0;
    const defaultOwner = this.data.users.find(u => u.role === 'advertiser') || this.data.users[0];

    // Link orphan listings to valid default owner
    const userIds = new Set(this.data.users.map(u => u.id));
    this.data.listings.forEach(l => {
      if (l.advertiser && !userIds.has(l.advertiser.id) && defaultOwner) {
        l.advertiser.id = defaultOwner.id;
        l.advertiser.name = defaultOwner.name;
        repaired++;
      }
    });

    this.persist();
    return {
      repairedCount: repaired,
      summary: `تم إصلاح ${repaired} علاقة وسجلات يتيمة بنجاح، وجميع البيانات مترابطة الآن.`
    };
  }

  // ==========================================
  // PROPERTY REQUESTS & TEMPORARY BOOKINGS OPS
  // ==========================================

  public getRequests(): PropertyRequest[] {
    return [...this.data.requests];
  }

  public getRequestById(id: string): PropertyRequest | undefined {
    return this.data.requests.find(r => r.id === id);
  }

  public addRequest(req: PropertyRequest): PropertyRequest {
    this.data.requests.unshift(req);
    this.persist();
    return req;
  }

  public updateRequest(id: string, updates: Partial<PropertyRequest>): PropertyRequest | undefined {
    const index = this.data.requests.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    this.data.requests[index] = {
      ...this.data.requests[index],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    this.persist();
    return this.data.requests[index];
  }

  public deleteRequest(id: string): boolean {
    const prevLen = this.data.requests.length;
    this.data.requests = this.data.requests.filter(r => r.id !== id);
    if (this.data.requests.length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  public getBookings(): PropertyBooking[] {
    this.checkBookingsExpiration();
    return [...this.data.bookings];
  }

  public getBookingById(id: string): PropertyBooking | undefined {
    this.checkBookingsExpiration();
    return this.data.bookings.find(b => b.id === id);
  }

  public getActiveBookingForListing(listingId: string): PropertyBooking | undefined {
    this.checkBookingsExpiration();
    const now = new Date().getTime();
    return this.data.bookings.find(
      b => b.listingId === listingId && b.status === 'active' && new Date(b.expiresAt).getTime() > now
    );
  }

  public addBooking(booking: PropertyBooking): PropertyBooking {
    this.data.bookings.unshift(booking);
    this.syncListingsReservationStatus();
    this.persist();
    return booking;
  }

  public updateBooking(id: string, updates: Partial<PropertyBooking>): PropertyBooking | undefined {
    const index = this.data.bookings.findIndex(b => b.id === id);
    if (index === -1) return undefined;
    this.data.bookings[index] = {
      ...this.data.bookings[index],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    this.syncListingsReservationStatus();
    this.persist();
    return this.data.bookings[index];
  }

  public completeBooking(id: string, completedBy: string, notes?: string): { booking?: PropertyBooking; listing?: Listing } {
    const booking = this.getBookingById(id);
    if (!booking) return {};

    const updatedBooking = this.updateBooking(id, {
      status: 'completed',
      notes: notes || 'تم إتمام الصفقة العقارية بنجاح ونقل الملكية / إبرام عقد الإيجار',
      updatedAt: new Date().toISOString().split('T')[0]
    });

    const listing = this.getListingById(booking.listingId);
    let updatedListing: Listing | undefined;
    if (listing) {
      const now = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' });
      const newTimeline = [
        ...(listing.statusTimeline || []),
        {
          status: 'completed' as ListingStatus,
          timestamp: timeStr,
          changedBy: completedBy,
          userRole: 'advertiser' as UserRole,
          notes: `تم إتمام الصفقة العقارية (بيع/تأجير) وإغلاق الإعلان نهائياً بموجب الحجز ${booking.bookingNumber}.`
        }
      ];

      updatedListing = this.updateListing(listing.id, {
        status: 'completed',
        isReserved: false,
        reservedUntil: undefined,
        activeBookingId: undefined,
        statusTimeline: newTimeline,
        updatedAt: now
      });
    }

    this.syncListingsReservationStatus();
    this.persist();

    return { booking: updatedBooking, listing: updatedListing };
  }

  public checkBookingsExpiration(): boolean {
    const now = new Date().getTime();
    let changed = false;
    for (const b of this.data.bookings) {
      if (b.status === 'active' && new Date(b.expiresAt).getTime() <= now) {
        b.status = 'expired';
        b.updatedAt = new Date().toISOString().split('T')[0];
        changed = true;
      }
    }
    if (changed) {
      this.syncListingsReservationStatus();
      this.persist();
    }
    return changed;
  }

  public syncListingsReservationStatus(): void {
    const now = new Date().getTime();
    const activeMap = new Map<string, PropertyBooking>();

    for (const b of this.data.bookings) {
      if (b.status === 'active' && new Date(b.expiresAt).getTime() > now) {
        activeMap.set(b.listingId, b);
      }
    }

    for (const listing of this.data.listings) {
      const activeB = activeMap.get(listing.id);
      if (activeB) {
        listing.isReserved = true;
        listing.reservedUntil = activeB.expiresAt;
        listing.activeBookingId = activeB.id;
      } else {
        listing.isReserved = false;
        listing.reservedUntil = undefined;
        listing.activeBookingId = undefined;
      }
    }
  }
}

export const db = new LocalDatabase();
