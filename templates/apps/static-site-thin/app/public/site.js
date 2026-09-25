// The site's only browser script — plain JavaScript, served as written, no
// build step. The pages work without it; it adds small conveniences.
//
// Add behaviour here the same way: find elements by a data attribute or class
// the page templates (src/pages.mjs) write, and leave the page usable when
// this file fails to load.
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
