import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { useLocation } from 'react-router-dom'

import UiStore from '../../stores/UiStore'
import Header from '../reusable/Header.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
})

const endpoint = 'https://dymajo.com/waka-guidebooks/regions'
const pageCache = {}

const fetchPage = async location => {
  const url = `${endpoint}/${location.substring('/guide/'.length)}`

  if (pageCache[url] === undefined) {
    const res = await fetch(url)
    if (res.redirected && !window.location.pathname.endsWith('/')) {
      UiStore.customHistory.replace([window.location.pathname, '/'].join(''))
      return ''
    }

    const data = await res.text()

    // remove the footer & get the relevant bits
    const fakeDOM = document.createElement('html')
    fakeDOM.innerHTML = data
    fakeDOM.querySelector('h1:first-child').remove() // the name of the repo
    fakeDOM.querySelector('.footer').remove() // a github message

    const header = fakeDOM.querySelector('h1:first-child').innerText
    fakeDOM.querySelector('h1:first-child').remove() // remove the header we just extracted into the header component

    // boops all the elements between H2s into divs,
    // so position sticky works, and we can collapse them easy
    Array.from(fakeDOM.querySelectorAll('h2')).forEach(header => {
      let el = header

      const elements = []
      while (el.nextElementSibling !== null && el.nextElementSibling.tagName !== 'H2') {
        el = el.nextElementSibling
        elements.push(el)
      }

      const div = document.createElement('div')
      elements.forEach(el => div.appendChild(el))
      header.parentNode.replaceChild(div, header)
      div.prepend(header)
    })

    const body = fakeDOM.querySelector('body div:first-child').innerHTML

    pageCache[url] = {
      header,
      body,
    }
  }

  return pageCache[url]
}

const hijackLinks = e => {
  if (e.target.tagName === 'A') {
    const { href } = e.target
    if (href.startsWith(window.location.origin)) {
      if (href.split('#')[0] !== window.location.href) {
        e.preventDefault()
        UiStore.absolutePush(href)
      }
    } else {
      e.preventDefault()
      window.open(href)
    }
  }
}

const Guidebook = () => {
  const [html, setHtml] = useState('')

  // pulls from guidebook server whenever location updates
  const location = useLocation()
  useEffect(() => {
    const fetchData = async () => {
      setHtml(await fetchPage(location.pathname))
    }
    fetchData()
  }, [location])

  return (
    <View style={styles.wrapper}>
      <Header title={html.header} />
      <LinkedScroll>
        <View style={styles.innerWrapper}>
          <div
            className="guidebook-styles"
            dangerouslySetInnerHTML={{ __html: html.body }}
            onClick={hijackLinks}
          />
        </View>
      </LinkedScroll>
    </View>
  )
}

export default Guidebook
