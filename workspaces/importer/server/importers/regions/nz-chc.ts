import config from '../../config'
import connection from '../../db/connection'
import logger from '../../logger'
import SingleImporter from '../SingleImporter'

const log = logger(config.prefix, config.version)

class ChchImporter extends SingleImporter {
  constructor() {
    super({
      zipname: 'metro-christchurch',
      url: 'http://metroinfo.co.nz/Documents/gtfs.zip',
    })
  }

  postImport = async () => {
    // obtained from: http://www.metroinfo.co.nz/timetables/Pages/default.aspx
    // with Array.from(document.querySelectorAll('.routelistingnumber'))
    // .map((item) => ({route_short_name: item.innerText.trim(), color: item.style.backgroundColor}))
    const sqlRequest = connection.get().request()
    await sqlRequest.query(`
      UPDATE routes SET route_text_color = 'FFFFFF', route_color = '444444'
      UPDATE routes SET route_color = '3EBCED' WHERE route_short_name = 'B'
      UPDATE routes SET route_color = 'F37021' WHERE route_short_name = 'O'
      UPDATE routes SET route_color = '79BC43' WHERE route_short_name = 'Oa' or route_short_name = 'Oc'
      UPDATE routes SET route_color = '554588' WHERE route_short_name = 'P'
      UPDATE routes SET route_color = 'FFC20E' WHERE route_short_name = 'Y'
      UPDATE routes SET route_color = 'EC008C' WHERE route_short_name = '17'
      UPDATE routes SET route_color = 'F79328' WHERE route_short_name = '28'
      UPDATE routes SET route_color = '00539F' WHERE route_short_name = '29'
      UPDATE routes SET route_color = '0074AD' WHERE route_short_name = '44'
      UPDATE routes SET route_color = '956338' WHERE route_short_name = '45'
      UPDATE routes SET route_color = 'DA6FAB' WHERE route_short_name = '60'
      UPDATE routes SET route_color = '717DBD' WHERE route_short_name = '80'
      UPDATE routes SET route_color = 'F05A4E' WHERE route_short_name = '85'
      UPDATE routes SET route_color = 'CBDB2A' WHERE route_short_name = '86'
      UPDATE routes SET route_color = 'C34074' WHERE route_short_name = '87'
      UPDATE routes SET route_color = 'C41039' WHERE route_short_name = '95'
      UPDATE routes SET route_color = '88807E' WHERE route_short_name = '100'
      UPDATE routes SET route_color = '46A299' WHERE route_short_name = '107'
      UPDATE routes SET route_color = 'FAA61A' WHERE route_short_name = '120'
      UPDATE routes SET route_color = '5F9937' WHERE route_short_name = '125'
      UPDATE routes SET route_color = '9F3925' WHERE route_short_name = '130'
      UPDATE routes SET route_color = '0DB14B' WHERE route_short_name = '135'
      UPDATE routes SET route_color = '00929E' WHERE route_short_name = '140'
      UPDATE routes SET route_color = '9D6DA9' WHERE route_short_name = '155'
      UPDATE routes SET route_color = '46BA7C' WHERE route_short_name = '820'
      UPDATE routes SET route_color = '005899' WHERE route_short_name = 'F'
      UPDATE routes SET route_color = '4D2094' WHERE route_short_name = 'CS'
      UPDATE routes SET route_color = '4D2094' WHERE route_short_name = 'SS'
    `)
    log.info('Post Import: Set Colors')
  }
}

export default ChchImporter
