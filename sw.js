// sw.js

// 1. تم تحديث إصدار الكاش إلى v8 لتفعيل التغييرات
const CACHE_NAME = 'prayer-times-generator-v8'; // <--- تم التغيير هنا

// الأصول الأساسية للتطبيق التي سيتم تخزينها دائماً
const urlsToCache = [
  '/',
  'index.html',
  'icon-1024.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  // 2. تم إضافة رابط الخط الجديد ليتم تخزينه في الكاش
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;700&display=swap' // <--- تم التغيير هنا
];

// حدث التثبيت: يتم تخزين الأصول الأساسية للتطبيق
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching basic assets');
        return cache.addAll(urlsToCache);
      })
  );
});

// حدث التفعيل: يتم حذف ملفات الكاش القديمة لضمان استخدام النسخة الجديدة فقط
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// حدث الجلب: يتم اعتراض طلبات الشبكة لتطبيق استراتيجيات التخزين المؤقت
self.addEventListener('fetch', event => {
  const { request } = event;

  // استراتيجية خاصة لملفات الإعدادات (JSON) -> "الشبكة أولاً، ثم الكاش كبديل"
  if (request.url.includes('/settings/')) {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // إذا نجح الطلب من الشبكة، نقوم بتخزين نسخة محدثة في الكاش
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, responseClone);
            });
          return networkResponse;
        })
        .catch(() => {
          // إذا فشل الطلب من الشبكة (مثل عدم وجود اتصال)، نبحث في الكاش عن نسخة قديمة
          console.log('Network request failed. Serving from cache:', request.url);
          return caches.match(request);
        })
    );
    return; // إنهاء التنفيذ هنا لهذه الطلبات
  }

  // استراتيجية للملفات الأخرى (الأصول الأساسية) -> "الكاش أولاً"
  event.respondWith(
    caches.match(request)
      .then(response => {
        // إذا وجدنا الملف في الكاش، نستخدمه. وإلا، نطلبه من الشبكة.
        return response || fetch(request);
      })
  );
});