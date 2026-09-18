export default {
  common: {
    serverError: 'Internal server error',
    unauthorized: 'Unauthorized',
  },
  dashboard: {
    title: 'Surveys',
  },
  survey: {
    title: 'Title',
    status: 'Status',
    created: 'Created',
    notFound: 'Survey not found',
    closed: 'Survey is closed',
    slugTaken: 'Slug is already taken',
  },
  question: {
    notFound: 'Question not found',
    surveyIdRequired: 'survey_id is required',
    typeText: 'Short Text',
    typeMultipleChoice: 'Multiple Choice',
    typeRating: 'Rating',
    typeYesNo: 'Yes / No',
    typeLongText: 'Long Text',
  },
  response: {
    notFound: 'Response not found',
    surveyIdRequired: 'survey_id is required',
  },
  shareLink: {
    notFound: 'Share link not found',
    surveyIdRequired: 'survey_id is required',
  },
  template: {
    notFound: 'Template not found',
  },
  notification: {
    notFound: 'Notification not found',
  },
  builder: {
    title: 'Survey Builder',
    untitled: 'Untitled question',
    addQuestion: 'Add Question',
  },
  nav: {
    dashboard: 'Dashboard',
    surveys: 'Surveys',
    responses: 'Responses',
    settings: 'Settings',
  },
} as const
