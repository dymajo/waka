import React from 'react';
import { Navbar, Container, Collapse, Nav, NavItem } from 'reactstrap';
import { Link } from 'react-router-dom';
const WakaNavbar = () => {
  return (
    <Navbar color="dark" dark expand="md">
      <Container className="d-flex justify-content-between">
        <Link to="/" className="navbar-brand d-flex align-items-center">
          <strong>Waka</strong>
          &nbsp;Orchestrator
        </Link>
        <Collapse className="collapse navbar-collapse" id="navbarCollapse">
          <Nav className="mr-auto" navbar>
            <NavItem>
              <Link to="/config" className="nav-link">
                Configuration
              </Link>
            </NavItem>
          </Nav>
        </Collapse>
      </Container>
    </Navbar>
  );
};

export default WakaNavbar;
