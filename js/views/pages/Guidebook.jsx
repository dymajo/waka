import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { useLocation } from 'react-router-dom'

import { endpoint, guidebookEndpoint } from '../../../local.js'
import UiStore from '../../stores/UiStore'
import Header from '../reusable/Header.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'
import Spinner from '../reusable/Spinner.jsx'

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
})

const pageCache = {}
const cityCache = {}

const getCity = async prefix => {
  if (!(prefix in cityCache)) {
    const url = `${endpoint}/${prefix}/info`
    try {
      const res = await fetch(url)
      const data = await res.json()
      cityCache[prefix] = data.longName
    } catch (err) {
      // doesn't really matter in the ui if this request fails
      console.error(err)
    }
  }
  return cityCache[prefix] || undefined
}

const fetchPage = async location => {
  const url = `${guidebookEndpoint}/${location.substring('/guide/'.length)}`

  if (pageCache[url] === undefined) {
    let res
    try {
      res = await fetch(url)
    } catch (err) {
      if (!location.endsWith('/')) {
        return fetchPage(`${location}/`)
      }
      console.error('Network error?')
    }

    const data = await res.text()

    // remove the footer & get the relevant bits
    const fakeDOM = document.createElement('html')
    fakeDOM.innerHTML = data
    fakeDOM.querySelector('h1:first-child').remove() // the name of the repo
    const footer = fakeDOM.querySelector('.footer') // a github message
    const footerHTML = footer.innerHTML
    footer.remove()

    const headerText = fakeDOM.querySelector('h1:first-child').innerText
    fakeDOM.querySelector('h1:first-child').remove() // remove the header we just extracted into the header component

    // boops all the elements between H2s into divs,
    // so position sticky works, and we can collapse them easy
    Array.from(fakeDOM.querySelectorAll('h2')).forEach(header => {
      let el = header

      const elements = []
      while (
        el.nextElementSibling !== null &&
        el.nextElementSibling.tagName !== 'H2'
      ) {
        el = el.nextElementSibling
        elements.push(el)
      }

      const section = document.createElement('div')
      const content = document.createElement('div')
      section.className = 'h2-section collapsed'
      content.className = 'h2-section-content'

      elements.forEach(el => content.appendChild(el))

      header.parentNode.replaceChild(section, header)
      section.prepend(header)
      section.append(content)
    })

    const body = fakeDOM.querySelector('body div:first-child')
    const newFooter = document.createElement('footer')
    newFooter.innerHTML = footerHTML
    body.appendChild(newFooter)

    pageCache[url] = {
      header: headerText,
      body: body.innerHTML,
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
  } else if (e.target.tagName === 'H2') {
    e.target.parentNode.classList.toggle('collapsed')
  }
}

const Guidebook = () => {
  const location = useLocation()
  const [html, setHtml] = useState('')
  const [cityName, setCityName] = useState('')

  // pulls from guidebook server whenever location updates
  useEffect(() => {
    const fetchData = async () => {
      const data = await Promise.all([
        fetchPage(location.pathname),
        getCity(location.pathname.split('/')[2]),
      ])
      setHtml(data[0])
      setCityName(data[1])
    }
    fetchData()
  }, [location])

  return (
    <View style={styles.wrapper}>
      <Header title={html.header} subtitle={cityName} />
      <LinkedScroll>
        <View>
          {html.body ? (
            <div
              className="guidebook-styles"
              dangerouslySetInnerHTML={{ __html: html.body }}
              onClick={hijackLinks}
            />
          ) : (
            <Spinner />
          )}
        </View>
      </LinkedScroll>
    </View>
  )
}

export default Guidebook
