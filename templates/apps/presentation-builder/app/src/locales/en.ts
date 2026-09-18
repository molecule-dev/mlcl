export default {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    close: 'Close',
    loading: 'Loading...',
    error: 'Something went wrong',
  },
  dashboard: {
    title: 'My Presentations',
    newPresentation: 'New Presentation',
    untitled: 'Untitled Presentation',
    slideCount: '{{count}} slides',
    duplicate: 'Duplicate',
    empty: 'No presentations yet. Create your first deck!',
  },
  editor: {
    addSlide: 'Add Slide',
    speakerNotes: 'Speaker Notes',
    speakerNotesPlaceholder: 'Add speaker notes...',
    slideNumber: 'Slide {{number}}',
    slideContent: 'Slide Content Area',
    properties: 'Properties',
    layout: 'Layout',
    transition: 'Transition',
    layouts: {
      blank: 'Blank',
      title: 'Title',
      titleContent: 'Title + Content',
      twoColumn: 'Two Column',
      image: 'Image',
    },
    transitions: {
      none: 'None',
      fade: 'Fade',
      slide: 'Slide',
      zoom: 'Zoom',
    },
  },
  presentations: {
    notFound: 'Presentation not found',
    untitled: 'Untitled Presentation',
  },
  slides: {
    presentationRequired: 'Presentation ID is required',
    notFound: 'Slide not found',
  },
  themes: {
    notFound: 'Theme not found',
  },
  export: {
    presentationNotFound: 'Presentation not found',
    presentationRequired: 'Presentation ID is required',
  },
  pricing: {
    heading: 'Choose your {{appName}} plan',
    limits: {
      exports: '{{count}} exports',
      presentations: '{{count}} presentations',
      slides: '{{count}} slides',
      themes: '{{count}} themes',
      advancedFeatures: 'Advanced features: {{value}}',
      dataExport: 'Data export: {{value}}',
    },
  },
  auth: {
    unauthorized: 'Authentication required.',
  },
  errors: {
    internalServer: 'Internal server error',
  },
}
