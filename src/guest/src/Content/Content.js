const Browser = require('../Browser/Browser')
const Wavebox = require('../Wavebox/Wavebox')
const ChildWindowProvider = require('./ChildWindowProvider')

class Content {
  /* **************************************************************************/
  // Lifecycle
  /* **************************************************************************/

  constructor () {
    this.browser = new Browser({
      contextMenu: {
        copyCurrentPageUrlOption: true,
        openCurrentPageInBrowserOption: true,
        hasSettingsOption: false,
        hasChangeDictionaryOption: false
      }
    })
    this.wavebox = new Wavebox()
    this.childWindow = new ChildWindowProvider()
  }
}

module.exports = Content
