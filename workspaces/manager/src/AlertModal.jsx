import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';

const AlertModal = ({ modal, toggle, content, fn }) => {
  const CloseButton = (
    <button className="close btn btn-round" type="button" onClick={toggle}>
      <span aria-hidden="true">&times;</span>
    </button>
  );
  return (
    <Modal isOpen={modal} toggle={toggle} backdrop="static">
      <ModalHeader close={CloseButton}>Alert</ModalHeader>
      <ModalBody>{content}</ModalBody>
      {fn && (
        <ModalFooter>
          <Button onClick={fn}>Submit</Button>
        </ModalFooter>
      )}
    </Modal>
  );
};

export default AlertModal;
