import { ChangeDetectorRef, Component, inject, type OnDestroy } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { type SafeHtml, DomSanitizer } from '@angular/platform-browser'
import { RouterLink } from '@angular/router'
import { createVersionService, t } from '@molecule/app-angular'
import { map } from 'rxjs'
import { MoleculeModal } from '@molecule/app-ui-angular'
import { getClassMap } from '@molecule/app-ui'
import { getLocale, setLocale, getProvider } from '@molecule/app-i18n'
import { IconComponent } from './icon.component.js'
import { loadContent } from '../config.js'
import { APP_NAME } from '../branding.js'

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [AsyncPipe, RouterLink, MoleculeModal, IconComponent],
  template: `
    <section [class]="cm.footerBar">
      <a routerLink="/about" [class]="cm.footerLink">
        {{ footerAbout }}
      </a>
      <button
        type="button"
        (click)="openPrivacy()"
        [class]="cm.footerButton"
      >
        {{ t('footer.privacyPolicy') }}
      </button>
      <button
        type="button"
        (click)="openTerms()"
        [class]="cm.footerButton"
      >
        {{ t('footer.termsOfService') }}
      </button>
      <button
        type="button"
        (click)="languageOpen = true"
        [class]="cm.footerButton"
        [attr.aria-label]="t('footer.language')"
      >
        <app-icon name="globe" [size]="14"></app-icon>
        {{ currentLocaleName }}
      </button>
      <span [class]="cm.footerLink">v{{ (version$ | async) || '1.0.0' }}</span>
    </section>

    <mol-modal [open]="privacyOpen" [title]="t('footer.privacyPolicy')" size="lg" (close)="privacyOpen = false">
      <div [class]="cm.prose" [innerHTML]="privacyHtml"></div>
    </mol-modal>

    <mol-modal [open]="termsOpen" [title]="t('footer.termsOfService')" size="lg" (close)="termsOpen = false">
      <div [class]="cm.prose" [innerHTML]="termsHtml"></div>
    </mol-modal>

    <mol-modal [open]="languageOpen" [title]="t('footer.language')" size="lg" (close)="languageOpen = false">
      <div [class]="cm.languageGrid">
        @for (l of locales; track l.code) {
          <button
            type="button"
            (click)="changeLocale(l.code)"
            [class]="l.code === getLocale() ? cm.languageActive : cm.languageOption"
          >
            {{ l.name }}
          </button>
        }
      </div>
    </mol-modal>
  `,
})
export class FooterComponent implements OnDestroy {
  private cdr = inject(ChangeDetectorRef)
  private sanitizer = inject(DomSanitizer)
  private versionService = createVersionService()
  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }
  t = t

  version$ = this.versionService.state$.pipe(map(s => s.version))
  privacyOpen = false
  termsOpen = false
  languageOpen = false
  get footerAbout(): string { return t('footer.about', { appName: APP_NAME }) }
  get privacyHtml(): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(t('content.privacyPolicy', { appName: APP_NAME })) }
  get termsHtml(): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(t('content.termsOfService')) }
  getLocale = getLocale
  get locales(): { code: string; name: string }[] { return (getProvider()?.getLocales() ?? []).sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)) }
  get currentLocaleName(): string { return this.locales.find((l: { code: string }) => l.code === getLocale())?.name ?? '' }

  async openPrivacy(): Promise<void> {
    await loadContent('privacyPolicy')
    this.privacyOpen = true
    this.cdr.detectChanges()
  }

  async openTerms(): Promise<void> {
    await loadContent('termsOfService')
    this.termsOpen = true
    this.cdr.detectChanges()
  }

  changeLocale(code: string): void {
    this.languageOpen = false
    this.cdr.detectChanges()
    setLocale(code)
  }

  ngOnDestroy(): void {
    this.versionService.destroy()
  }
}
