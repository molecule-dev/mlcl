import { Component } from '@angular/core'
import { t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_DESCRIPTION, WEBSITE_URL } from '../branding.js'

/**
 * About page — reachable at `/about`, where the Footer's "About" link points.
 * Every app ships one so the footer link is never a dead end. Edit freely, or
 * replace with your own story/marketing content. `WEBSITE_URL` (in branding.ts)
 * is your public site — when set, this page links out to it; leave it empty and
 * the outbound link simply doesn't render.
 */
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [],
  template: `
    <div [class]="wrapperClasses">
      <h1 [class]="headingClasses">{{ title }}</h1>
      <p [class]="descriptionClasses">{{ description }}</p>
      @if (WEBSITE_URL) {
        <p [class]="linkWrapperClasses">
          <a [class]="cm.link" [href]="WEBSITE_URL" target="_blank" rel="noopener noreferrer">
            {{ visitWebsite }}
          </a>
        </p>
      }
    </div>
  `,
})
export class AboutComponent {
  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }
  WEBSITE_URL = WEBSITE_URL
  get wrapperClasses(): string { return this.cm.cn(this.cm.textCenter, this.cm.sp('py', 12)) }
  get headingClasses(): string { return this.cm.cn(this.cm.textSize('3xl'), this.cm.fontWeight('bold')) }
  get descriptionClasses(): string { return this.cm.cn(this.cm.sp('pt', 4), this.cm.textMuted) }
  get linkWrapperClasses(): string { return this.cm.sp('pt', 6) }
  get title(): string { return t('about.title', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' }) }
  get description(): string { return t('about.description', undefined, { defaultValue: APP_DESCRIPTION }) }
  get visitWebsite(): string { return t('about.visitWebsite', undefined, { defaultValue: 'Visit our website →' }) }
}
