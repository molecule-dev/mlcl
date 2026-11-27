import 'zone.js'
import './bonds.js'
import './index.css'
import { bootstrapApplication } from '@angular/platform-browser'

import { provideDomPlacement } from '@molecule/app-angular'

import { ShowcaseComponent } from './Showcase.js'

bootstrapApplication(ShowcaseComponent, { providers: [provideDomPlacement()] }).catch((err) =>
  console.error(err),
)
