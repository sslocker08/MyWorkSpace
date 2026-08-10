// NavBar.js — wires up logo + nav links to the router
// (Router handles click interception; this module adds hover ink-trail effect)

export function initNavBar() {
  const links = document.querySelectorAll('#nav-links a, #logo')

  links.forEach(a => {
    a.addEventListener('mouseenter', () => {
      a.style.setProperty('--hover-progress', '1')
    })
    a.addEventListener('mouseleave', () => {
      a.style.setProperty('--hover-progress', '0')
    })
  })
}
