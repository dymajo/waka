import React from 'react';

const Config = () => {
  return (
    <>
      <div className="mb-4">
        <h4>Deployed Version</h4>
        <div className="bg-dark">
          <pre className="text-light p-4" id="footer"></pre>
        </div>
      </div>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center mb-1">
        <h2>Config</h2>
        <div className="btn-toolbar mb-2 mb-md-0">
          <button
            className="btn btn-sm btn-outline-danger"
            id="restartOrchestrator"
          >
            Restart Orchestrator
          </button>
          &nbsp;
          <button className="btn btn-sm btn-outline-primary" id="saveConfig">
            Save Config
          </button>
        </div>
      </div>
      <div className="mb-4">
        <div className="form-group">
          <textarea
            className="form-control pre"
            id="configTextarea"
            rows="36"
          ></textarea>
          <small className="form-text text-muted">
            You can override the
            <a href="https://github.com/dymajo/waka-server/blob/master/waka-orchestrator/configManager.js">
              default config
            </a>
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
          ></textarea>
          <small className="form-text text-muted">
            This configuration is only used if realtime is running as a seperate
            process. When running as seperate processes, it is recommended that
            you change the keyvalue implementation to dynamo.
          </small>
        </div>
      </div>
    </>
  );
};

export default Config;
