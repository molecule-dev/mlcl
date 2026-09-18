import 'zone.js'
import './bonds.js'
import './index.css'
import { bootstrapApplication } from '@angular/platform-browser'

import { ShowcaseComponent } from './Showcase.js'

bootstrapApplication(ShowcaseComponent).catch((err) => console.error(err))
