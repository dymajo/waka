import Polyglot from 'node-polyglot'
import en from '../../translations/en.js'

export class TranslationStore {
  constructor() {
    this.i18n = new Polyglot({ phrases: en })
  }

  t = (str, args) => {
    return this.i18n.t(str, args)
  }
}

export const { t } = new TranslationStore()
