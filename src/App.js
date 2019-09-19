import React from 'react';
import Workers from './Workers';
import WakaNavbar from './WakaNavbar';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import Config from './Config';
function App() {
  return (
    <Router>
      <WakaNavbar />
      <div className="container main-container pt-5">
        <Switch>
          <Route exact path="/config" component={Config} />
          <Route exact path="/" component={Workers} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;
