import { ChangeDetectorRef, Component, inject, type OnDestroy, type OnInit } from '@angular/core'
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser'
import { RouterLink } from '@angular/router'
import type { Subscription } from 'rxjs'

import { createVersionService, MoleculeI18nService, t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'
import { MoleculeModal } from '@molecule/app-ui-angular'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
import { IconComponent } from './icon.component.js'

/**
 * App-shell footer — About link, Privacy/Terms modals, language picker, version.
 *
 * Port of `@molecule/app-footer-react`'s `AppFooter` (with `aboutHref="/about"`
 * and this app's `loadContent`): `<footer>` is the contentinfo landmark rather
 * than a bare `<section>`, legal content comes from the i18n catalog and falls
 * back to a clear "not configured" placeholder instead of a blank modal, and the
 * version label is translated.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, MoleculeModal, IconComponent],
  template: `
    <footer [class]="cm.footerBar">
      <a routerLink="/about" [class]="cm.footerLink">{{ aboutLabel }}</a>
      <button type="button" (click)="openPrivacy()" [class]="cm.footerButton">
        {{ t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' }) }}
      </button>
      <button type="button" (click)="openTerms()" [class]="cm.footerButton">
        {{ t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' }) }}
      </button>
      <button
        type="button"
        (click)="languageOpen = true"
        [class]="cm.footerButton"
        [attr.aria-label]="t('footer.language', {}, { defaultValue: 'Language' })"
      >
        <svg appIcon name="globe" [size]="14"></svg>{{ localeLabel }}
      </button>
      <span [class]="cm.footerLink">{{ versionLabel }}</span>
    </footer>

    <mol-modal
      [open]="privacyOpen"
      [title]="t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })"
      size="lg"
      (close)="privacyOpen = false"
    >
      @if (hasPrivacy) {
        <div [class]="cm.prose" [innerHTML]="privacyHtml"></div>
      } @else {
        <p [class]="cm.prose">{{ legalNotConfigured }}</p>
      }
    </mol-modal>

    <mol-modal
      [open]="termsOpen"
      [title]="t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })"
      size="lg"
      (close)="termsOpen = false"
    >
      @if (hasTerms) {
        <div [class]="cm.prose" [innerHTML]="termsHtml"></div>
      } @else {
        <p [class]="cm.prose">{{ legalNotConfigured }}</p>
      }
    </mol-modal>

    <mol-modal
      [open]="languageOpen"
      [title]="t('footer.language', {}, { defaultValue: 'Language' })"
      size="lg"
      (close)="languageOpen = false"
    >
      <div [class]="cm.languageGrid">
        @for (language of locales; track language.code) {
          <button
            type="button"
            (click)="changeLocale(language.code)"
            [class]="language.code === locale ? cm.languageActive : cm.languageOption"
          >
            {{ language.name }}
          </button>
        }
      </div>
    </mol-modal>
  `,
})
export class FooterComponent implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly i18n = inject(MoleculeI18nService)
  private readonly sanitizer = inject(DomSanitizer)
  private readonly versionService = createVersionService()
  private readonly subscriptions: Subscription[] = []

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t

  /** Whether the privacy modal is open. */
  privacyOpen = false
  /** Whether the terms modal is open. */
  termsOpen = false
  /** Whether the language picker is open. */
  languageOpen = false
  /** The active locale code. */
  locale = this.i18n.locale
  /** The available locales, sorted by display name (the React footer's order). */
  locales: { code: string; name: string }[] = []
  /** The running app version. */
  version = '1.0.0'

  ngOnInit(): void {
    this.subscriptions.push(
      this.i18n.locale$.subscribe((locale) => {
        this.locale = locale
        this.cdr.markForCheck()
      }),
      this.i18n.locales$.subscribe((available) => {
        this.locales = [...available].sort((a, b) => a.name.localeCompare(b.name))
        this.cdr.markForCheck()
      }),
      this.versionService.state$.subscribe((state) => {
        this.version = state.version || '1.0.0'
        this.cdr.markForCheck()
      }),
    )
  }

  /** The About link label. */
  get aboutLabel(): string {
    return t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })
  }

  /** The translated version label (`v1.0.0`). */
  get versionLabel(): string {
    return t('footer.version', { version: this.version }, { defaultValue: 'v{{version}}' })
  }

  /** The language button's visible label — a space then the locale name, like React. */
  get localeLabel(): string {
    return ` ${this.locales.find((entry) => entry.code === this.locale)?.name ?? ''}`
  }

  /** The placeholder shown when the app registered no legal content. */
  get legalNotConfigured(): string {
    return t(
      'footer.legalNotConfigured',
      {},
      {
        defaultValue: 'This content has not been configured yet. The app owner must provide it.',
      },
    )
  }

  /** The privacy policy markup from the i18n catalog (empty until the app supplies it). */
  get privacyText(): string {
    return t('content.privacyPolicy', { appName: this.escapeHtml(APP_NAME) }, { defaultValue: '' })
  }

  /** The terms of service markup from the i18n catalog (empty until the app supplies it). */
  get termsText(): string {
    return t('content.termsOfService', { appName: this.escapeHtml(APP_NAME) }, { defaultValue: '' })
  }

  /** Whether the app registered privacy-policy content. */
  get hasPrivacy(): boolean {
    return this.privacyText.trim().length > 0
  }

  /** Whether the app registered terms-of-service content. */
  get hasTerms(): boolean {
    return this.termsText.trim().length > 0
  }

  /** The trusted privacy policy markup for the modal body. */
  get privacyHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.privacyText)
  }

  /** The trusted terms of service markup for the modal body. */
  get termsHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.termsText)
  }

  /**
   * HTML-escapes an interpolation value before it enters a translation whose
   * result is rendered as HTML — an app name containing markup would otherwise
   * execute inside the legal content.
   *
   * @param value - The value to escape.
   * @returns The escaped value.
   */
  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  /** Loads the privacy policy content, then opens its modal. */
  async openPrivacy(): Promise<void> {
    await loadContent('privacyPolicy')
    this.privacyOpen = true
    this.cdr.markForCheck()
  }

  /** Loads the terms of service content, then opens its modal. */
  async openTerms(): Promise<void> {
    await loadContent('termsOfService')
    this.termsOpen = true
    this.cdr.markForCheck()
  }

  /**
   * Switches the app locale, then closes the picker.
   *
   * @param code - The locale code to switch to.
   */
  changeLocale(code: string): void {
    this.i18n.setLocale(code)
    this.languageOpen = false
    this.cdr.markForCheck()
  }

  /** Releases the version / locale subscriptions. */
  ngOnDestroy(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe()
    this.versionService.destroy()
  }
}
