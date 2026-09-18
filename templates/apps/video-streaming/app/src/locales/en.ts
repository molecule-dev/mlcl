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
  videoFeed: {
    searchPlaceholder: 'Search videos...',
    latest: 'Latest',
    popular: 'Popular',
    empty: 'No videos found.',
  },
  videos: {
    notFound: 'Video not found',
    forbidden: 'Not your video',
    searchRequired: 'Search query is required',
    invalidReaction: 'Invalid reaction',
    views: '{{count}} views',
    like: 'Like',
    dislike: 'Dislike',
    chapters: 'Chapters',
    processing: 'Video is processing...',
    upload: 'Upload',
    publish: 'Publish',
  },
  channels: {
    notFound: 'Channel not found',
    forbidden: 'Not your channel',
    subscribe: 'Subscribe',
    unsubscribe: 'Unsubscribe',
    subscribers: '{{count}} subscribers',
  },
  comments: {
    notFound: 'Comment not found',
    forbidden: 'Not your comment',
    placeholder: 'Add a comment...',
    reply: 'Reply',
  },
  follows: {
    notFound: 'Subscription not found',
  },
  playlists: {
    notFound: 'Playlist not found',
    forbidden: 'Not your playlist',
    create: 'Create playlist',
    addToPlaylist: 'Add to playlist',
  },
  library: {
    notFound: 'Item not found',
    history: 'History',
    watchLater: 'Watch later',
    liked: 'Liked',
  },
  notifications: {
    notFound: 'Notification not found',
    markAllRead: 'Mark all as read',
  },
  pricing: {
    heading: 'Choose your {{appName}} plan',
    limits: {
      maxChannels: '{{count}} channels',
      maxVideos: '{{count}} videos',
      advancedFeatures: 'Advanced features: {{value}}',
      canExport: 'Data export: {{value}}',
    },
  },
  search: {
    placeholder: 'Search {{appName}}',
    videos: 'Videos',
    channels: 'Channels',
    noResults: 'No results found',
  },
  settings: {
    title: 'Settings',
  },
  trending: {
    title: 'Trending',
  },
  upload: {
    title: 'Upload a video',
    titleField: 'Title',
    descriptionField: 'Description',
    submit: 'Upload',
  },
  studio: {
    title: 'Studio',
    analytics: 'Analytics',
    content: 'Content',
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
}
