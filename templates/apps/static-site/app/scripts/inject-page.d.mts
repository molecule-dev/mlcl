/** One rendered page, as `injectPage` puts it into the shell. */
export interface InjectedPage {
  html: string
  title?: string
  description?: string
  /** Extra `<head>` markup, inserted before `</head>`. */
  head?: string
}

/** Put one rendered page into the client shell (`index.html`) and return the document. */
export function injectPage(shell: string, page: InjectedPage): string
