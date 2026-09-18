export default {
  flags: {
    title: 'Feature Flags',
    key: 'Key',
    name: 'Name',
    type: 'Type',
    rollout: 'Rollout',
    status: 'Status',
    enabled: 'Enabled',
    disabled: 'Disabled',
    filterEnv: 'Environment',
    production: 'Production',
    staging: 'Staging',
    development: 'Development',
    notFound: 'Flag not found',
  },
  flagDetail: {
    key: 'Key',
    type: 'Type',
    rollout: 'Rollout',
    default: 'Default Value',
    targetingRules: 'Targeting Rules',
    auditLog: 'Audit Log',
  },
  rules: {
    attribute: 'Attribute',
    operator: 'Operator',
    value: 'Value',
    serveValue: 'Serve',
    priority: 'Priority',
    notFound: 'Rule not found',
  },
  environments: {
    notFound: 'Environment not found',
  },
  segments: {
    notFound: 'Segment not found',
  },
  pricing: {
    heading: 'Choose your {{app}} plan',
    limits: {
      auditLog: 'audit-log',
      environments: 'environments',
      flags: 'flags',
      advancedFeatures: 'Advanced features',
      canExport: 'Data export',
    },
  },
  auth: {
    unauthorized: 'Authentication required',
  },
  errors: {
    internalServer: 'Internal server error',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
  },
}
