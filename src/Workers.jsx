import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, DropdownItem } from 'reactstrap';
import CreateWorkerModal from './CreateWorkerModal';
import Worker from './Worker';
import Popup from './Popup';

const Workers = () => {
  const [workers, setWorkers] = useState([]);
  const [mappings, setMappings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState(false);
  const [alertContent, setAlertContent] = useState('');
  const toggleAlertModal = content => {
    if (alertModal) {
      setAlertContent('');
      setAlertModal(false);
    } else {
      setAlertContent(content);
      setAlertModal(true);
    }
  };
  const runAction = async (action, input) => {
    const r = await fetch(action, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
    const data = await r.json();
    if (data.command) {
      // setAlertModal(true);
      toggleAlertModal(data.command);
    }
    getWorkers(false);
  };
  const getWorkers = async (loading = true) => {
    try {
      if (loading) {
        setLoading(true);
      }

      const mappingsRequest = await fetch('/mapping');
      const mappingsResponse = await mappingsRequest.json();
      setMappings(mappingsResponse);

      const workersRequest = await fetch('/worker');
      const workersResponse = await workersRequest.json();
      setWorkers(workersResponse);
      if (loading) {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    getWorkers();
  }, []);
  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center mb-2">
        <h2>Workers</h2>
        <div className="btn-toolbar mb-2 mb-md-0">
          <CreateWorkerModal />
        </div>
      </div>
      <div id="workers" className="mb-4">
        {loading || workers.length === 0 ? (
          'Loading...'
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Prefix</th>
                <th>Version</th>
                <th>DB Name</th>
                <th>Import Status</th>
                <th>Status</th>
                <th>New Realtime?</th>
                <th>Control</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(worker => (
                <Worker
                  key={worker.id}
                  worker={worker}
                  mapping={mappings[worker.prefix]}
                  runAction={runAction}
                />
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <div>
        <h5>Instructions</h5>
        <ul>
          <li>
            To add a worker, either turn on an auto-updater, or grab a version
            string from
            <a href="https:waka.app/a/nz-wlg/info">waka.app/a/nz-wlg/info.</a>
          </li>
          <li>
            If you're running this locally, the import is not automatic. Use the
            actions menu to get a Docker command that will populate your
            database.
          </li>
          <li>
            If you use the Docker command, shapes will also not be imported by
            default.
          </li>
        </ul>
      </div>
      {alertModal && (
        <Popup
          toggle={toggleAlertModal}
          content={alertContent}
          modal={alertModal}
        />
      )}
    </>
  );
};

export default Workers;
