import type { Language } from './types'

const translations = {
  fa: {
    appName: 'دستیار تغذیه نوزاد',
    appSubtitle: 'پشتیبانی آرام و مبتنی بر شواهد برای شیردهی و تغذیه نوزاد',
    signIn: 'ورود',
    register: 'ایجاد حساب',
    email: 'ایمیل',
    password: 'رمز عبور',
    confirmPassword: 'تکرار رمز عبور',
    authIntro: 'گفتگوهای شما خصوصی می‌مانند و در حساب‌تان ذخیره می‌شوند.',
    passwordHint: 'حداقل ۱۰ نویسه، شامل حرف و عدد',
    signInAction: 'ورود به گفتگوها',
    registerAction: 'ساخت حساب',
    switchToRegister: 'حساب ندارید؟ ایجاد حساب',
    switchToSignIn: 'حساب دارید؟ وارد شوید',
    newChat: 'گفتگوی جدید',
    conversations: 'گفتگوها',
    noHistory: 'هنوز گفتگویی ندارید',
    welcomeTitle: 'چه چیزی درباره شیردهی ذهن‌تان را مشغول کرده؟',
    welcomeBody: 'سؤال‌تان را با هر مقدار جزئیاتی که راحت هستید بنویسید. از وارد کردن نام کامل یا اطلاعات شناسایی خودداری کنید.',
    placeholder: 'سؤال خود را درباره شیردهی یا تغذیه نوزاد بنویسید…',
    send: 'ارسال',
    sending: 'در حال دریافت پاسخ',
    logout: 'خروج',
    deleteAccount: 'حذف حساب',
    deleteAccountPrompt: 'برای حذف دائمی حساب و همه گفتگوها، ایمیل خود را وارد کنید:',
    deleteConversation: 'حذف گفتگو',
    renameConversation: 'تغییر نام گفتگو',
    renamePrompt: 'نام جدید گفتگو را وارد کنید:',
    menu: 'باز کردن فهرست گفتگوها',
    close: 'بستن',
    account: 'حساب کاربری',
    privacyNote: 'این ابزار اطلاعات عمومی ارائه می‌کند و جایگزین پزشک یا مشاور شیردهی نیست. در وضعیت فوری از خدمات درمانی محلی کمک بگیرید.',
    q1: 'آیا شیر مادر برای نوزاد ۴ ماهه کافی است؟',
    q2: 'چطور می‌توانم شیر بیشتری تولید کنم؟',
    q3: 'علائم کافی بودن شیر مادر چیست؟',
    loadError: 'بارگذاری گفتگوها انجام نشد. دوباره تلاش کنید.',
    sendError: 'پاسخ دریافت نشد. پیام شما ذخیره شد؛ لطفاً دوباره تلاش کنید.',
    retry: 'تلاش دوباره',
    authError: 'اطلاعات ورود صحیح نیست یا عملیات انجام نشد.',
    passwordMismatch: 'رمزهای عبور یکسان نیستند.',
    accountCreatedCheckEmail: 'حساب ساخته شد. اگر تأیید ایمیل فعال است، ایمیل خود را بررسی کنید.',
    rateLimited: 'پیام‌ها خیلی سریع ارسال شدند. یک دقیقه صبر کنید و دوباره تلاش کنید.',
    emptyTitle: 'گفتگوی جدید',
    language: 'English',
  },
  en: {
    appName: 'Infant Feeding Assistant',
    appSubtitle: 'Calm, evidence-informed support for breastfeeding and infant feeding',
    signIn: 'Sign in',
    register: 'Create account',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    authIntro: 'Your conversations stay private and are saved to your account.',
    passwordHint: 'At least 10 characters, including a letter and number',
    signInAction: 'Open my conversations',
    registerAction: 'Create account',
    switchToRegister: 'No account? Create one',
    switchToSignIn: 'Already registered? Sign in',
    newChat: 'New conversation',
    conversations: 'Conversations',
    noHistory: 'No conversations yet',
    welcomeTitle: 'What would you like to understand about breastfeeding?',
    welcomeBody: 'Share only the detail you are comfortable with. Avoid including full names or identifying information.',
    placeholder: 'Ask about breastfeeding or infant feeding…',
    send: 'Send',
    sending: 'Preparing a response',
    logout: 'Sign out',
    deleteAccount: 'Delete account',
    deleteAccountPrompt: 'Enter your email to permanently delete your account and all conversations:',
    deleteConversation: 'Delete conversation',
    renameConversation: 'Rename conversation',
    renamePrompt: 'Enter a new conversation name:',
    menu: 'Open conversation list',
    close: 'Close',
    account: 'Account',
    privacyNote: 'This tool provides general information and does not replace a clinician or lactation consultant. Seek local medical care for urgent concerns.',
    q1: 'Is breast milk alone enough for a 4-month-old baby?',
    q2: 'How can I increase my milk supply?',
    q3: 'What are the signs that my baby is getting enough milk?',
    loadError: 'Conversations could not be loaded. Please try again.',
    sendError: 'No response was received. Your message was saved; please try again.',
    retry: 'Try again',
    authError: 'The account details were not accepted or the request failed.',
    passwordMismatch: 'The passwords do not match.',
    accountCreatedCheckEmail: 'Account created. Check your inbox if email confirmation is enabled.',
    rateLimited: 'Messages were sent too quickly. Wait a minute and try again.',
    emptyTitle: 'New conversation',
    language: 'فارسی',
  },
} as const

export type TranslationKey = keyof (typeof translations)['en']

export function t(language: Language, key: TranslationKey): string {
  return translations[language][key]
}

export function direction(language: Language): 'rtl' | 'ltr' {
  return language === 'fa' ? 'rtl' : 'ltr'
}

export function formatConversationTime(language: Language, value: string): string {
  const date = new Date(value)
  return new Intl.DateTimeFormat(language === 'fa' ? 'fa-IR' : 'en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
