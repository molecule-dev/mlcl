export default {
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    edit: 'Edit',
    back: 'Back',
    search: 'Search',
  },
  auth: {
    unauthorized: 'Authentication required',
  },
  errors: {
    internalServer: 'Internal server error',
  },
  catalog: {
    notFound: 'Course not found',
    forbidden: 'Not your course',
  },
  lessons: {
    notFound: 'Lesson not found',
    forbidden: 'Enrollment required',
  },
  enrollments: {
    notFound: 'Enrollment not found',
    paymentRequired: 'Payment is required to enroll in this course.',
    paymentNotFound: 'Payment record not found.',
    welcomeSubject: 'Welcome to {{title}}',
    welcomeBody: 'You are now enrolled in {{title}}. Start learning today!',
  },
  reviews: {
    notFound: 'Review not found',
    forbidden: 'Not your review',
    enrollmentRequired: 'Enrollment required to review',
    alreadyReviewed: 'You already reviewed this course',
  },
  certificates: {
    notFound: 'Certificate not found',
    notCompleted: 'Course not completed yet',
    providerUnavailable: 'PDF provider not configured',
    heading: 'Certificate of Completion',
    awardedTo: 'Awarded to',
    forCourse: 'For completing',
    number: 'Certificate number',
    issuedAt: 'Issued at',
    download: 'Download certificate',
  },
  instructors: {
    notFound: 'Instructor not found',
    forbidden: 'Forbidden',
  },
  browse: {
    eyebrow: '{{appName}} archive',
    title: 'Browse every course',
    subtitle:
      'Filter the editorial archive by topic, level, and price. Every course is hand-curated by our editors.',
    filter: {
      category: 'Category',
      level: 'Level',
      price: 'Price',
      rating: 'Rating',
    },
    results: 'Showing {{count}} courses',
    sort: 'Sort by',
    prev: 'Previous page',
    next: 'Next page',
  },
  courseHeroBanner: {
    lectura: '{{appName}}',
  },
  enrolledCourseCard: {
    status: {
      inProgress: 'In progress',
      completed: 'Completed',
      notStarted: 'Not started',
    },
    lessons: '{{done}} of {{total}} lessons',
    downloadCertificate: 'View certificate',
    startLearning: 'Start learning',
    continue: 'Continue',
  },
  pricing: {
    heading: 'Choose your {{appName}} plan',
    limits: {
      maxCatalog: '{{count}} catalog',
      maxCertificates: '{{count}} certificates',
      maxEnrollments: '{{count}} enrollments',
      maxInstructors: '{{count}} instructors',
      maxLessons: '{{count}} lessons',
      maxReviews: '{{count}} reviews',
      advancedFeatures: 'Advanced features: {{value}}',
      canExport: 'Data export: {{value}}',
    },
  },
  player: {
    previous: 'Previous',
    next: 'Next Lesson',
    complete: 'Complete Course',
    contents: 'Course Contents',
  },
  notifications: {
    title: 'Notifications',
    markAllRead: 'Mark all as read',
  },
  myLearning: {
    title: 'My Learning',
    eyebrow: 'Continue where you left off',
    empty: 'You are not enrolled in any courses yet.',
  },
  instructor: {
    title: 'Instructor Dashboard',
    earnings: 'Total earnings',
    courses: 'Courses',
    students: 'Students',
    rating: 'Average rating',
  },
  checkout: {
    title: 'Checkout',
    paymentMethod: 'Payment method',
    submit: 'Pay now',
  },
  settings: {
    title: 'Settings',
  },
  billing: {
    error: {
      unknownPriceId: 'Unknown priceId "{{priceId}}".',
      providerUnavailable: 'Billing provider unavailable. Try again later.',
      checkoutFailed: 'Could not start checkout. Try again later.',
      cancelFailed: 'No active subscription to cancel.',
    },
  },
  mediaStreaming: {
    error: {
      noProvider: 'Media streaming provider not configured. Call setProvider() first.',
    },
  },
  pdf: {
    error: {
      noProvider: 'PDF provider not configured. Call setProvider() first.',
    },
  },
}
