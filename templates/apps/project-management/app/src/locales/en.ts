export default {
  app: {
    name: '{{appName}}',
  },
  brand: {
    name: '{{appName}}',
    tagline: 'Project Manager',
  },
  common: {
    save: 'Save Changes',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    confirm: 'Confirm',
    add: 'Add',
    create: 'Create',
    update: 'Update',
    loading: 'Loading…',
    newProject: 'New Project',
    newTask: 'New Task',
    serverError: 'Internal server error',
  },
  nav: {
    dashboard: 'Dashboard',
    board: 'Board',
    tasks: 'Tasks',
    timeline: 'Timeline',
    calendar: 'Calendar',
    settings: 'Settings',
    projects: 'Projects',
    myTasks: 'My Tasks',
    noProjects: 'No projects yet',
  },
  search: {
    placeholder: 'Search tasks, projects, or people...',
  },
  header: {
    workspace: "{{name}}'s Workspace",
    avatarAlt: "{{name}}'s Profile Avatar",
  },
  profile: {
    role: 'Project Lead',
  },
  dashboard: {
    title: 'Dashboard',
    subtitle: "Here's your project overview for today.",
    greeting: 'Good morning, {{name}}',
    activeProjects: 'Active Projects',
    myTasks: 'My Tasks',
    myTasksTitle: 'My Tasks',
    exportReport: 'Export Report',
    exportUnavailable: 'Export will be enabled once the reports backend is connected.',
    createTaskUnavailable: 'Task creation flow is coming soon.',
  },
  kpi: {
    priorityFocus: 'Priority focus',
    tasksDueLabel: 'Tasks Due Today',
    tasksDueCount: '{{count}}',
    overdueTasksLabel: 'Overdue Tasks',
    overdueCount: '{{count}}',
    teamMembersLabel: 'Team Members',
    teamCount: '{{count}}',
    teamStatus: 'All online',
    status: {
      needsAction: 'Needs Action',
    },
  },
  kpiCard: {
    weeklyChange: '{{change}} this week',
    metricName: 'Active Projects',
    metricValue: '{{value}}',
  },
  tasks: {
    viewAll: 'View all tasks',
  },
  task: {
    title: 'Title',
    status: 'Status',
    priority: 'Priority',
    assignee: 'Assignee',
    dueDate: 'Due Date',
    notFound: 'Task not found',
    statuses: {
      todo: 'To Do',
      in_progress: 'In Progress',
      in_review: 'In Review',
      done: 'Done',
    },
    error: {
      list: 'Failed to list tasks',
      read: 'Failed to get task',
      create: 'Failed to create task',
      update: 'Failed to update task',
      delete: 'Failed to delete task',
      unauthorized: 'Unauthorized',
    },
  },
  board: {
    title: 'Board',
    addTask: 'Add Task',
  },
  taskList: {
    title: 'Tasks',
  },
  timeline: {
    title: 'Timeline',
    milestones: 'Milestones',
  },
  milestone: {
    notFound: 'Milestone not found',
    error: {
      list: 'Failed to list milestones',
      read: 'Failed to get milestone',
      create: 'Failed to create milestone',
      update: 'Failed to update milestone',
      delete: 'Failed to delete milestone',
      unauthorized: 'Unauthorized',
    },
  },
  member: {
    error: {
      list: 'Failed to list members',
      add: 'Failed to add member',
      remove: 'Failed to remove member',
      exists: 'User is already a member',
      unauthorized: 'Unauthorized',
    },
  },
  project: {
    title: 'Project',
    notFound: 'Project not found',
    error: {
      list: 'Failed to list projects',
      read: 'Failed to get project',
      create: 'Failed to create project',
      update: 'Failed to update project',
      delete: 'Failed to delete project',
      unauthorized: 'Unauthorized',
    },
  },
  demo: {
    taskTitle: 'Sprint Planning Sync',
    projectName: 'Website Redesign',
    taskDate: 'Oct 26',
  },
  login: {
    pageTitle: 'Sign In',
  },
  signup: {
    pageTitle: 'Create Account',
  },
  forgotPassword: {
    pageTitle: 'Reset Password',
  },
  resetPassword: {
    pageTitle: 'Set New Password',
  },
  settings: {
    pageTitle: 'Settings',
  },
  pricing: {
    pageTitle: 'Pricing',
    headingTemplate: 'Choose your {{appName}} plan',
    projectsCount: '{{count}} projects',
    tasksCount: '{{count}} tasks',
    milestonesCount: '{{count}} milestones',
    membersPerProject: '{{count}} members / project',
    realtime: 'Realtime collaboration: {{value}}',
    advancedReports: 'Burndown / velocity reports: {{value}}',
    calendarView: 'Calendar / timeline: {{value}}',
    customFields: 'Custom fields: {{value}}',
  },
  planUpdated: {
    heading: 'Your plan has been updated',
    subheading: 'Thank you!',
    returnButton: 'Return home',
  },
  privacy: {
    pageTitle: 'Privacy Policy',
  },
  terms: {
    pageTitle: 'Terms of Service',
  },
  help: {
    pageTitle: 'Help',
  },
} as const
