import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalBody,
  ModalHeader,
  FormGroup,
  Button,
  ModalFooter,
  Label,
  Input
} from 'reactstrap';
export default function CreateWorkerModal({ createWorker }) {
  const [modal, setmodal] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [version, setVersion] = useState('');
  const [shapesContainer, setShapesContainer] = useState('shapes-us-west-2.waka.app');
  const [shapesRegion, setShapesRegion] = useState('us-west-2');
  const [dbConfig, setDbConfig] = useState('local');
  const [newRealtime, setNewRealtime] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [cities, setCities] = useState([]);
  const getCities = async () => {
    setLoadingCities(true);
    const res = await fetch('/private/prefixes');
    const data = await res.json();
    const cities = Object.keys(data).map(city => ({
      label: data[city].longName,
      value: city
    }));
    cities.sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }))
    setPrefix(cities[0].value)
    setCities(cities);
    setLoadingCities(false);
  };
  useEffect(() => {
    getCities();
  }, []);
  const onCreateWorker = () => {
    createWorker({
      prefix,
      version,
      shapesContainer,
      shapesRegion,
      dbconfig: dbConfig,
      newRealtime
    });
    setmodal(false)
  };
  const disabled =
    !prefix || !version || !shapesContainer || !shapesRegion || !dbConfig;
  const CloseButton = (
    <button
      className="close btn btn-round"
      type="button"
      onClick={() => setmodal(false)}
    >
      <span aria-hidden="true">&times;</span>
    </button>
  );
  return (
    <>
      <Button outline color="primary" onClick={() => setmodal(true)}>
        Create Worker
      </Button>
      <Modal isOpen={modal} toggle={() => setmodal(false)} backdrop="static">
        <ModalHeader close={CloseButton}>Create Worker</ModalHeader>

        <ModalBody>
          <FormGroup>
            <Label htmlFor="workerPrefix">Prefix</Label>
            <Input
              type="select"
              disabled={loadingCities || cities.length === 0}
              onChange={e =>
                setPrefix(e.target.options[e.target.selectedIndex].value)
              }
            >
              {cities.map(city => (
                <option key={city.value} value={city.value}>
                  {city.label}
                </option>
              ))}
            </Input>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="workerVersion">Version</Label>
            <Input
              onChange={e => setVersion(e.target.value)}
              type="text"
              value={version}
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="workerVersion">Shapes Container</Label>
            <Input
              onChange={e => setShapesContainer(e.target.value)}
              type="text"
              value={shapesContainer}
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="workerVersion">Shapes Region</Label>
            <Input
              onChange={e => setShapesRegion(e.target.value)}
              type="text"
              value={shapesRegion}
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="workerDbconfig">
              DB Config <code>config.db[yourConfig]</code>
            </Label>
            <Input
              onChange={e => setDbConfig(e.target.value)}
              type="text"
              value={dbConfig}
            />
          </FormGroup>
          <FormGroup check>
            <Input
              onChange={e => setNewRealtime(e.target.checked)}
              type="checkbox"
              className="form-check-Input"
              checked={newRealtime}
            />
            <Label className="form-check-Label" htmlFor="workerNewRealtime">
              New Realtime (experimental)
            </Label>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setmodal(false)}>
            Cancel
          </Button>
          <Button color="primary" onClick={onCreateWorker} disabled={disabled}>
            Create Worker
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
