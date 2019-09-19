import React, { useState } from 'react';
import {
  Button,
  Badge,
  DropdownItem,
  Dropdown,
  DropdownToggle,
  DropdownMenu
} from 'reactstrap';

const Worker = ({ worker, mapping = {}, runAction }) => {
  const { id, prefix } = worker;
  const workerData = { id, prefix };
  const [toggle, setToggle] = useState(false);
  const action = action => {
    return runAction(action, workerData);
  };
  let ctrl = (
    <Badge pill color="warning">
      inactive
    </Badge>
  );
  let btns = (
    <Button onClick={() => action('/mapping/set')} color="light" size="sm">
      activate
    </Button>
  );
  let recycle = '';
  if (worker.id === mapping.value) {
    ctrl = (
      <Badge pill color="success">
        active
      </Badge>
    );
    btns = (
      <Button
        onClick={() => action('/mapping/delete')}
        color="danger"
        size="sm"
      >
        unmap
      </Button>
    );
    recycle = (
      <>
        <DropdownItem onClick={() => action('/worker/recycle')}>
          Recycle Service
        </DropdownItem>
        <DropdownItem divider />
      </>
    );
  }

  const dropdown = (
    <Dropdown size="sm" isOpen={toggle} toggle={() => setToggle(!toggle)}>
      <DropdownToggle color="light" caret>
        actions
      </DropdownToggle>

      <DropdownMenu>
        {recycle}
        <DropdownItem onClick={() => action('/worker/docker')}>
          Get Docker Import Command
        </DropdownItem>
        <DropdownItem onClick={() => action('/worker/status/pendingimport')}>
          Start Import (pending)
        </DropdownItem>
        <DropdownItem
          onClick={() => action('/worker/status/pendingimport-willmap')}
        >
          Start Import & Map (pending)
        </DropdownItem>
        <DropdownItem onClick={() => action('/worker/status/imported')}>
          Set Status to Imported
        </DropdownItem>
        <DropdownItem onClick={() => action('/worker/status/imported-willmap')}>
          Set Status to Imported & Map
        </DropdownItem>
        <DropdownItem divider />
        <DropdownItem onClick={() => action('/worker/delete')}>
          Delete Worker
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );

  return (
    <tr data-id={worker.id} data-prefix={worker.prefix}>
      <td>
        <a href={`../${worker.prefix}/info`}>{worker.prefix}</a>
      </td>
      <td>{worker.version}</td>
      <td className="td-truncate" title={worker.dbname}>
        {worker.dbname}
      </td>
      <td>{worker.status}</td>
      <td>{ctrl}</td>
      <td>{worker.newRealtime ? 'True' : 'False'}</td>
      <td>
        {btns}
        {dropdown}
      </td>
    </tr>
  );
};

export default Worker;
