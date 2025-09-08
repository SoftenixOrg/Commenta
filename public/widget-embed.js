// Embeddable widget script for external websites
;(() => {
  // Configuration
  const WIDGET_CONFIG = {
    apiBase: window.COMMENTS_API_BASE || "",
    cssUrl: window.COMMENTS_CSS_URL || "/widget.css",
    jsUrl: window.COMMENTS_JS_URL || "/widget.js",
  }

  // Load CSS
  function loadCSS(url) {
    if (document.querySelector(`link[href="${url}"]`)) return

    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = url
    document.head.appendChild(link)
  }

  // Load JavaScript
  function loadJS(url, callback) {
    if (document.querySelector(`script[src="${url}"]`)) {
      if (callback) callback()
      return
    }

    const script = document.createElement("script")
    script.src = url
    script.onload = callback
    document.head.appendChild(script)
  }

  // Initialize widget
  function initWidget() {
    const containers = document.querySelectorAll("[data-comments]")

    containers.forEach((container) => {
      const contentId = container.getAttribute("data-comments") || window.location.pathname
      const theme = container.getAttribute("data-theme") || "light"

      // Create unique ID if not exists
      if (!container.id) {
        container.id = "comments-" + Math.random().toString(36).substr(2, 9)
      }

      // Initialize widget
      const CommentsWidget = window.CommentsWidget // Declare the variable before using it
      new CommentsWidget({
        containerId: container.id,
        contentId: contentId,
        apiBase: WIDGET_CONFIG.apiBase,
        theme: theme,
      })
    })
  }

  // Load resources and initialize
  loadCSS(WIDGET_CONFIG.cssUrl)
  loadJS(WIDGET_CONFIG.jsUrl, initWidget)
})()
