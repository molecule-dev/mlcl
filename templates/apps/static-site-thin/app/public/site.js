// The site's only browser script — plain JavaScript, served as written, no
// build step. The pages work without it; it adds small conveniences.
//
// Add behaviour here the same way: find elements by a data attribute or class
// the page templates (src/pages.ts) write, and leave the page usable when
// this file fails to load. The post page's margin notes are not yours to
// script: @molecule/app-margin-notes-html ships their switches, taps, hover
// and phone panel in its own tag (see src/post-notes.ts) — do not add tap or
// toggle handlers for them here, and do not patch that package's script.
;(function () {
  'use strict'
  document.documentElement.setAttribute('data-js', '')

  // A copy button on every code block.
  if (navigator.clipboard) {
    document.querySelectorAll('.prose pre').forEach(function (pre) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'copy-code'
      button.textContent = 'Copy'
      button.setAttribute('aria-label', 'Copy code')
      button.addEventListener('click', function () {
        navigator.clipboard.writeText(pre.innerText.replace(/\nCopy$/, '')).then(function () {
          button.textContent = 'Copied'
          setTimeout(function () {
            button.textContent = 'Copy'
          }, 1500)
        })
      })
      pre.style.position = 'relative'
      pre.appendChild(button)
    })
  }
})()
