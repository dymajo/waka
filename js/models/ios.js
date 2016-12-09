let iostest = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
export class iOS {
  // ensures the rubber banding is in the correct place,
  // if they are already at the top of the div
  detect() {
    return iostest
  }
  triggerStart(event) {
    if (!iostest) {
      return true
    }
    var e = event.currentTarget
    var top = e.scrollTop
    var totalScroll = e.scrollHeight
    var currentScroll = top + e.offsetHeight

    if (top === 0) {
      e.scrollTop = 1
    } else if (currentScroll === totalScroll) {
      e.scrollTop = top - 1
    }
  }
  touchMoveFix(event) {
    if (!iostest) {
      return true
    }
    var isTouchMoveAllowed = false
    var target = event.target

    while (target !== null) {
      if (target.classList && target.classList.contains('enable-scrolling')) {
        isTouchMoveAllowed = true
        break
      }
      target = target.parentNode
    }

    if (!isTouchMoveAllowed) {
      event.preventDefault()
    }
  }
}