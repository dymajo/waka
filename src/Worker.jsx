import React, { useState } from 'react';
import {
  Button,
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
  let btns = (
    <Button onClick={() => action('mapping/set')} color="light" size="sm">
      activate
    </Button>
  );
  let recycle = '';
  if (worker.id === mapping.value) {
    btns = (
      <Button onClick={() => action('mapping/delete')} color="danger" size="sm">
        unmap
      </Button>
    );
    recycle = (
      <>
        <DropdownItem onClick={() => action('worker/recycle')}>
          Recycle Service
        </DropdownItem>
        <DropdownItem divider />
      </>
    );
  }

  const dropdown = (
    <Dropdown className="d-inline-block" size="sm" isOpen={toggle} toggle={() => setToggle(!toggle)}>
      <DropdownToggle color="light" caret>
        actions
      </DropdownToggle>

      <DropdownMenu>
        {recycle}
        <DropdownItem onClick={() => action('worker/docker')}>
          Get Docker Import Command
        </DropdownItem>
        <DropdownItem onClick={() => action('worker/status/pendingimport')}>
          Start Import (pending)
        </DropdownItem>
        <DropdownItem
          onClick={() => action('worker/status/pendingimport-willmap')}
        >
          Start Import & Map (pending)
        </DropdownItem>
        <DropdownItem onClick={() => action('worker/status/imported')}>
          Set Status to Imported
        </DropdownItem>
        <DropdownItem onClick={() => action('worker/status/imported-willmap')}>
          Set Status to Imported & Map
        </DropdownItem>
        <DropdownItem divider />
        <DropdownItem onClick={() => action('worker/delete')}>
          Delete Worker
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );

  return (
    <tr>
      <td className="pl-0">
        {worker.id === mapping.value ? <><a href={`../${worker.prefix}/info`}>{worker.prefix}</a> ⭐</> : worker.prefix}<br />
        <small className="text-muted">{worker.newRealtime ? 'GTFS-R' : 'No GTFS-R'}</small>
      </td>
      <td>
        {worker.version}<br />
        <small><code><strong>DB:</strong> {worker.dbname}</code></small>
      </td>
      <td>
        {worker.createdAt ? new Date(worker.createdAt).toLocaleString() : 'Creation unknown'}<br />
        <small className={worker.status.includes('imported') ? 'text-success' : 'text-muted'}>{worker.status}</small>   
      </td>
      <td className="text-right align-middle pr-0">
        {btns} {dropdown}
      </td>
    </tr>
  );
};

export default Worker;
