import polyglot from 'node-polyglot'
import en from '../../translations/en.js'

export class translationStore {
  constructor() {
    this.i18n = new polyglot({phrases: en})
  }
  t = (str, args) => {
    return this.i18n.t(str, args)
  }
}
export let TranslationStore = new translationStore()
export const t = TranslationStore.t