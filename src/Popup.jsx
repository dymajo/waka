import React from 'react';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';

const Popup = ({ modal, toggle, content }) => {
  const CloseButton = (
    <button className="close btn btn-round" type="button" onClick={toggle}>
      <span aria-hidden="true">&times;</span>
    </button>
  );
  return (
    <Modal isOpen={modal} toggle={toggle} backdrop="static">
      <ModalHeader close={CloseButton}>Alert</ModalHeader>
      <ModalBody>{content}</ModalBody>
    </Modal>
  );
};

export default Popup;
