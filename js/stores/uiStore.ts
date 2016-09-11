import { browserHistory } from 'react-router'

export namespace UiStore {
  let state = {
    goingBack: false,
    lastUrl: ''
  }
  export function getState() {
    return state
  }
  export function navigateSavedStations() {
    if (window.location.pathname === '/ss') {
      return
    } else if (state.lastUrl === '/ss') {
      browserHistory.goBack()  
    } else {
      browserHistory.push('/ss')
    }
  }
  export function handleState(e) { 
    state.lastUrl = window.location.pathname
    //console.log(state.lastUrl)
  }
  export function handleReactChange(prevState, nextState, replace, callback) {
    if (nextState.location.action == 'POP' && nextState.location.pathname == '/ss') {
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