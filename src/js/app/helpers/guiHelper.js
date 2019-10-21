export default class GUIHelper {
  constructor(gui) {
    this.gui = gui;
  }

  updateButtons() {
    Object.keys(this.gui.__folders).map(key => {
      this.gui.__folders[key].__controllers.map(guiObject => {
        guiObject.updateDisplay();
      });
    });
  }
}
