import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

import { UiStore } from '../../stores/uiStore.js'
import { t } from '../../stores/translationStore.js'
import { vars, paragraphStyles } from '../../styles.js'

import Header from '../reusable/header.jsx'
import { LinkedScroll } from '../reusable/linkedScroll.jsx'
import { LinkButton } from '../reusable/linkButton.jsx'

export class Sponsor extends React.Component {
  constructor(props) {
    super(props)
    UiStore.setCardPosition('max')
  }
  componentDidMount() {
    document.title = t('sponsor.title') + ' - ' + t('app.name')
  }
  render() {
    return (
      <View style={styles.wrapper}>
        <Header title={t('sponsor.title')} />
        <LinkedScroll>
          <Text style={[paragraphStyles.h2, { marginBottom: 0 }]}>
            {t('sponsor.slug', { appname: t('app.name') })}
          </Text>
          <Text style={[paragraphStyles.h2, { marginTop: 0 }]}>
            {t('sponsor.slug2')}
          </Text>
          <Text style={paragraphStyles.h1}>{t('sponsor.sponsorTitle')}</Text>
          <Text style={paragraphStyles.p}>
            {t('sponsor.sponsorDescription')}
          </Text>
          <View style={styles.buttonRow}>
            <LinkButton
              href="mailto:hello@dymajo.com"
              label={t('sponsor.email')}
            />
          </View>
          <Text style={paragraphStyles.h1}>{t('sponsor.patreonTitle')}</Text>
          <Text style={paragraphStyles.p}>
            {t('sponsor.patreonDescription')}
          </Text>
          <View style={styles.buttonRow}>
            <LinkButton href="https://patreon.com/dymajo" label="Pateron" />
          </View>
          <Text style={paragraphStyles.h1}>{t('sponsor.contributeTitle')}</Text>
          <Text style={paragraphStyles.p}>
            {t('sponsor.contributeDescription', { appname: t('app.name') })}
          </Text>
          <View style={styles.buttonRow}>
            <LinkButton
              href="https://github.com/consindo/waka"
              label="GitHub"
            />
          </View>
          <Text style={paragraphStyles.h1}>{t('sponsor.translateTitle')}</Text>
          <Text style={paragraphStyles.p}>
            {t('sponsor.translateDescription', { appname: t('app.name') })}
          </Text>
          <View style={styles.buttonRow}>
            <LinkButton
              href="mailto:hello@dymajo.com"
              label={t('sponsor.email')}
            />
          </View>
        </LinkedScroll>
      </View>
    )
  }
}
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  buttonRow: {
    paddingTop: vars.padding / 2,
    paddingLeft: vars.padding,
    paddingRight: vars.padding,
    paddingBottom: vars.padding / 2,
    flex: 1,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
})
