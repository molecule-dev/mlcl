import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'

import { APP_DESCRIPTION, APP_NAME, WEBSITE_URL } from '../branding.js'

/**
 * About page — reachable at `/about`, where the Footer's "About" link points.
 * Every app ships one so the footer link is never a dead end. Edit freely, or
 * replace with your own story/marketing content. `WEBSITE_URL` (in branding.ts)
 * is your public site — when set, this page links out to it; leave it empty and
 * the outbound link simply doesn't render.
 */
@Component({
  selector: 'app-about',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [],
  template: `
    <div [class]="cm.cn(cm.textCenter, cm.sp('py', 12))">
      <h1 [class]="cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))">{{ title }}</h1>
      <p [class]="cm.cn(cm.sp('pt', 4), cm.textMuted)">{{ description }}</p>
      @if (WEBSITE_URL) {
        <p [class]="cm.sp('pt', 6)">
          <a [class]="cm.link" [href]="WEBSITE_URL" target="_blank" rel="noopener noreferrer">
            {{ t('about.visitWebsite', undefined, { defaultValue: 'Visit our website →' }) }}
          </a>
        </p>
      }
    </div>
  `,
})
export class AboutComponent {
  private readonly i18n = useTranslation()

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm = getClassMap()

  /** The reactive translation function (re-evaluates on locale change). */
  protected readonly t = this.i18n.t

  /** The app's public site, when set (the outbound link's target). */
  protected readonly WEBSITE_URL = WEBSITE_URL

  /**
   * The page heading, with the app name interpolated. A getter because the
   * default value carries `{{appName}}`, which would close the template's own
   * interpolation delimiters if it appeared in them.
   */
  protected get title(): string {
    return this.i18n.t('about.title', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })
  }

  /** The app description (the branding default, translated when a locale has it). */
  protected get description(): string {
    return this.i18n.t('about.description', undefined, { defaultValue: APP_DESCRIPTION })
  }
}
