import { StyleSheet } from 'react-native'

export const vars = {
  headerHeight: 66,
  backgroundColor: '#f8f8f8',
  headerColor: '#273d52',
  accentColor: '#fb6754',
  borderColorWhite: '#eee',
  borderColor: '#ddd',
  padding: 16,

  smallFontSize: 13,
  defaultFontSize: 16,
  headerIconColor: '#666',
  fontFamily:
    '"Open Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif',

  desktopThreshold: 640,
}

const { padding, defaultFontSize, fontFamily } = vars
export const paragraphStyles = StyleSheet.create({
  h1: {
    display: 'block',
    fontWeight: '600',
    paddingTop: padding,
    paddingLeft: padding,
    paddingRight: padding,
    paddingBottom: padding / 4,
    marginBottom: padding / 2,
    fontSize: defaultFontSize,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#ddd',
    color: '#222',
    letterSpacing: -0.5,
    fontFamily,
  },
  h2: {
    display: 'block',
    fontWeight: '600',
    marginTop: padding * 1.5,
    marginLeft: padding,
    marginRight: padding,
    marginBottom: padding,
    fontSize: defaultFontSize,
    letterSpacing: -0.5,
    fontFamily,
  },
  p: {
    display: 'block',
    marginTop: padding / 2,
    marginBottom: padding / 2,
    paddingLeft: padding,
    paddingRight: padding,
    fontSize: defaultFontSize - 1,
    lineHeight: defaultFontSize * 1.3,
    fontFamily,
  },
})
