export class WebP {
  constructor() {
    this.testWebP()
    this.support = false
  }
  testWebP() {
    let webP = new Image()
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
    webP.onload = webP.onerror = () => {
      this.support = (webP.height === 2)
    }
  }
}
export let webp = new WebP()