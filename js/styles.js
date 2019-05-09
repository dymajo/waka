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

  desktopThreshold: 850,
}
export const paragraphStyles = StyleSheet.create({
  h1: {
    fontWeight: '600',
    paddingTop: vars.padding,
    paddingLeft: vars.padding,
    paddingRight: vars.padding,
    paddingBottom: vars.padding / 4,
    marginBottom: vars.padding / 2,
    fontSize: vars.defaultFontSize,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#ddd',
    color: '#222',
    letterSpacing: -0.5,
    fontFamily: vars.fontFamily,
  },
  h2: {
    fontWeight: '600',
    marginTop: vars.padding * 1.5,
    marginLeft: vars.padding,
    marginRight: vars.padding,
    marginBottom: vars.padding,
    fontSize: vars.defaultFontSize,
    letterSpacing: -0.5,
    fontFamily: vars.fontFamily,
  },
  p: {
    marginTop: vars.padding / 2,
    marginBottom: vars.padding / 2,
    paddingLeft: vars.padding,
    paddingRight: vars.padding,
    fontSize: vars.defaultFontSize - 1,
    lineHeight: vars.defaultFontSize * 1.3,
    fontFamily: vars.fontFamily,
  },
})
