import React, { useEffect, useState } from 'react';
import AlertModal from './AlertModal';
import { Button } from 'reactstrap';
const Config = () => {
  const [config, setConfig] = useState('');
  const [configRealtime, setConfigRealtime] = useState('');
  const [git, setGit] = useState('');
  const [alertModal, setAlertModal] = useState(false);
  const [alertContent, setAlertContent] = useState('');
  const [killModal, setKillModal] = useState(false);
  const toggleAlertModal = content => {
    if (alertModal) {
      setAlertContent('');
      setAlertModal(false);
    } else {
      setAlertContent(content);
      setAlertModal(true);
    }
  };
  const toggleKillModal = () => {
    if (killModal) {
      setKillModal(false);
    } else {
      setKillModal(true);
    }
  };

  const killOrchestrator = async () => {
    try {
      await runAction('/orchestrator/kill');
      toggleKillModal();
    } catch (error) {
      toggleAlertModal('something bad happened');
    }
  };

  const saveConfig = () => {
    try {
      const data = {
        config: JSON.parse(config),
        configRealtime: JSON.parse(configRealtime)
      };
      runAction('/config', data);
    } catch (error) {
      toggleAlertModal('Error in JSON');
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
      toggleAlertModal(data.command);
    }
    getConfig();
  };
  const getConfig = async () => {
    const res = await fetch('/config');
    const data = await res.json();
    setConfig(JSON.stringify(data.config, ' ', 2));
    setConfigRealtime(JSON.stringify(data.configRealtime, ' ', 2));
  };
  const getHash = async () => {
    const res = await fetch('/git');
    const git = await res.text();
    setGit(git);
  };
  useEffect(() => {
    getConfig();
    getHash();
  }, []);
  return (
    <>
      <div className="mb-4">
        <h4>Deployed Version</h4>
        <div className="bg-dark">
          <pre className="text-light p-4" id="footer">
            {git}
          </pre>
        </div>
      </div>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center mb-1">
        <h2>Config</h2>
        <div className="btn-toolbar mb-2 mb-md-0">
          <Button size="sm" outline color="danger" onClick={toggleKillModal}>
            Restart Orchestrator
          </Button>
          &nbsp;
          <Button size="sm" outline color="primary" onClick={saveConfig}>
            Save Config
          </Button>
        </div>
      </div>
      <div className="mb-4">
        <div className="form-group">
          <textarea
            className="form-control pre"
            id="configTextarea"
            rows="36"
            value={config}
            onChange={e => setConfig(e.target.value)}
          ></textarea>
          <small className="form-text text-muted">
            You can override the{' '}
            <a href="https://github.com/dymajo/waka-server/blob/master/waka-orchestrator/configManager.js">
              default config
            </a>{' '}
            by putting values in here. However, you will need to restart the
            app!
          </small>
        </div>
      </div>

      <h2>Realtime Config</h2>
      <div className="mb-4">
        <div className="form-group">
          <textarea
            className="form-control pre"
            id="configRealtimeTextarea"
            rows="16"
            value={configRealtime}
            onChange={e => setConfigRealtime(e.target.value)}
          ></textarea>
          <small className="form-text text-muted">
            This configuration is only used if realtime is running as a seperate
            process. When running as seperate processes, it is recommended that
            you change the keyvalue implementation to dynamo.
          </small>
        </div>
      </div>
      {alertModal && (
        <AlertModal
          toggle={toggleAlertModal}
          content={alertContent}
          modal={alertModal}
        />
      )}
      {killModal && (
        <AlertModal
          toggle={toggleKillModal}
          content={
            'Are you sure you want to restart the orchestrator?\nDepending on your environment, it may not restart automatically.'
          }
          modal={killModal}
          fn={killOrchestrator}
        />
      )}
    </>
  );
};

export default Config;
