import { browserHistory } from 'react-router'

export namespace UiStore {
  let state = {
    goingBack: false,
    lastUrl: ''
  }
  export function getState() {
    return state
  }
  export function navigateSavedStations(path: string) {
    if (window.location.pathname === path) {
      return
    } else if (state.lastUrl === path) {
      browserHistory.goBack()  
    } else {
      browserHistory.push(path)
    }
  }
  export function handleState(e) { 
    state.lastUrl = window.location.pathname
    //console.log(state.lastUrl)
  }
  export function handleReactChange(prevState, nextState, replace, callback) {
    if (nextState.location.action == 'POP' && (nextState.location.pathname == '/ss' || nextState.location.pathname == '/s')) {
      state.goingBack = true
      UiStore.trigger('goingBack')

      setTimeout(function() {
        requestAnimationFrame(function() {
          callback()
          state.goingBack = false
          UiStore.trigger('goingBack')
        })
      }, 550)
    } else {
      callback()
    }
  }
  /* THIS IS NOT VERY TYPESCRIPT */
  // But it's so simple I'll fix it later :)
  export function bind(event, fct){
    this._events = this._events || {};
    this._events[event] = this._events[event] || [];
    this._events[event].push(fct);
  }
  export function unbind(event, fct){
    this._events = this._events || {};
    if( event in this._events === false  )  return;
    this._events[event].splice(this._events[event].indexOf(fct), 1);
  }
  export function trigger(event /* , args... */){
    this._events = this._events || {};
    if( event in this._events === false  )  return;
    for(var i = 0; i < this._events[event].length; i++){
      this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
    }
  }
}
browserHistory.listenBefore(UiStore.handleState)