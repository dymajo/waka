import React, { useState, useEffect } from 'react';
import { Table } from 'reactstrap';
import CreateWorkerModal from './CreateWorkerModal';
import Worker from './Worker';
import AlertModal from './AlertModal';

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
    const r = await fetch(`/private/${action}`, {
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

      const mappingsRequest = await fetch('/private/mapping');
      const mappingsResponse = await mappingsRequest.json();
      setMappings(mappingsResponse);

      const workersRequest = await fetch('/private/worker');
      const workersResponse = await workersRequest.json();
      workersResponse.sort((a, b) => {
        // if they're both null, order by version
        if (a.createdAt === null && b.createdAt === null) { 
          return b.version.localeCompare(a.version)
        }
        // send null created at's to the bottom
        if (a.createdAt === null) return 1
        if (b.createdAt === null) return -1

        // if they have creation dates, order by that
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
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
          <Table className="mt-3">
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
        <h4>Instructions</h4>
        <ul>
          <li>
            To add a worker, either turn on an auto-updater, or grab a version
            string from{' '}
            <a href="https:waka.app/a/nz-wlg/info">waka.app/a/nz-wlg/info</a>.
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
        <AlertModal
          toggle={toggleAlertModal}
          content={alertContent}
          modal={alertModal}
        />
      )}
    </>
  );
};

export default Workers;
