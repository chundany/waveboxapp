const { app } = require('electron')
const settingStore = require('../stores/settingStore')
const {
  TraySettings: { SUPPORTS_TRAY_MINIMIZE_CONFIG }
} = require('../../shared/Models/Settings')
const MonitorWindow = require('./MonitorWindow')

class WindowManager {
  /* ****************************************************************************/
  // Lifecycle
  /* ****************************************************************************/

  /**
  * @param mailboxesWindow: the main window
  */
  constructor (mailboxesWindow) {
    this.contentWindows = []
    this.mailboxesWindow = null
    this.monitor = { window: null, ping: null, active: false }
    this.forceQuit = false
  }

  /**
  * Attaches a mailboxes window
  * @param mailboxesWindow: the window to attach
  */
  attachMailboxesWindow (mailboxesWindow) {
    if (this.mailboxesWindow) {
      throw new Error('Mailboxes window already attached')
    }
    this.mailboxesWindow = mailboxesWindow
    this.mailboxesWindow.on('close', (e) => this.handleClose(e))
    this.mailboxesWindow.on('closed', () => {
      this.mailboxesWindow = null
      app.quit()
    })
  }

  /* ****************************************************************************/
  // Events
  /* ****************************************************************************/

  /**
  * Handles the close event by trying to persist the mailbox window
  * @param evt: the event that occured
  */
  handleClose (evt) {
    if (!this.forceQuit) {
      let hide = false
      if (SUPPORTS_TRAY_MINIMIZE_CONFIG) {
        if (settingStore.tray.show && settingStore.tray.hideWhenClosed) {
          hide = true
        }
      } else {
        if (process.platform === 'darwin' || settingStore.tray.show) {
          hide = true
        }
      }

      if (hide) {
        this.mailboxesWindow.hide()
        evt.preventDefault()
        this.forceQuit = false
      }
    }
  }

  /* ****************************************************************************/
  // Adding
  /* ****************************************************************************/

  /**
  * Adds a content window
  * @param window: the window to add
  * @return this
  */
  addContentWindow (window) {
    this.contentWindows.push(window)
    window.on('closed', () => {
      this.contentWindows = this.contentWindows.filter((w) => w !== window)
    })
    return this
  }

  /* ****************************************************************************/
  // Monitor Window
  /* ****************************************************************************/

  /**
  * Opens a monitor window, or if one already open does nothing
  * @return this
  */
  openMonitorWindow () {
    if (this.monitor.active) { return }

    this.monitor.window = new MonitorWindow()
    this.monitor.window.create()
    this.monitor.ping = setInterval(() => {
      this.contentWindows.forEach((w) => w.pingResourceUsage())
      this.mailboxesWindow.pingResourceUsage()
    }, 2000)

    this.monitor.window.on('closed', () => {
      clearInterval(this.monitor.ping)
      this.monitor.window = null
      this.monitor.active = false
    })

    this.monitor.active = true

    return this
  }

  /**
  * Sends resource info to the monitoring window
  */
  submitProcessResourceUsage (info) {
    if (this.monitor.active && this.monitor.window) {
      this.monitor.window.submitProcessResourceUsage(info)
    }
  }

  /* ****************************************************************************/
  // Actions
  /* ****************************************************************************/

  /**
  * Handles a quit by trying to keep the mailbox window hidden
  */
  quit () {
    this.forceQuit = true
    this.mailboxesWindow.close()
  }

  /**
  * Focuses the next available window
  */
  focusNextWindow () {
    if (this.mailboxesWindow.isFocused()) {
      if (this.contentWindows.length) {
        this.contentWindows[0].focus()
      }
    } else {
      const focusedIndex = this.contentWindows.findIndex((w) => w.isFocused())
      if (focusedIndex === -1 || focusedIndex + 1 >= this.contentWindows.length) {
        this.mailboxesWindow.focus()
      } else {
        this.contentWindows[focusedIndex + 1].focus()
      }
    }
  }

  /**
  * Focuses the main mailboxes window and shows it if it's hidden
  */
  focusMailboxesWindow () {
    if (this.focused() === this.mailboxesWindow) {
      return // If there's already a focused window, do nothing
    }

    if (!this.mailboxesWindow.isVisible()) {
      this.mailboxesWindow.show()
    }
    this.mailboxesWindow.focus()
  }

  /**
  * Toggles the mailboxes window visibility by hiding or showing the mailboxes windoww
  */
  toggleMailboxWindowVisibilityFromTray () {
    if (process.platform === 'win32') {
      // On windows clicking on non-window elements (e.g. tray) causes window
      // to lose focus, so the window will never have focus
      if (this.mailboxesWindow.isVisible()) {
        this.mailboxesWindow.close()
      } else {
        this.mailboxesWindow.show()
        this.mailboxesWindow.focus()
      }
    } else {
      if (this.mailboxesWindow.isVisible()) {
        if (this.focused() === this.mailboxesWindow) {
          this.mailboxesWindow.hide()
        } else {
          this.mailboxesWindow.focus()
        }
      } else {
        this.mailboxesWindow.show()
        this.mailboxesWindow.focus()
      }
    }
  }

  /**
  * Shows and focuses the mailboxes window
  */
  showMailboxWindowFromTray () {
    this.mailboxesWindow.show()
    this.mailboxesWindow.focus()
  }

  /* ****************************************************************************/
  // Querying
  /* ****************************************************************************/

  /**
  * @return the focused window
  */
  focused () {
    if (this.mailboxesWindow.isFocused()) {
      return this.mailboxesWindow
    } else {
      return this.contentWindows.find((w) => w.isFocused())
    }
  }

  /**
  * Gets the content windows with the given ownerId
  * @param ownerId: the id to get
  * @return a list of content windows with the specified owner id
  */
  getContentWindowsWithOwnerId (ownerId) {
    return this.contentWindows.filter((w) => w.ownerId === ownerId)
  }
}

module.exports = WindowManager
