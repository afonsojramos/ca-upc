import Config from '../../data/config';

export default class GUIHelper {
  static updateButtons(gui) {
    Object.keys(gui.__folders).map(key => {
      gui.__folders[key].__controllers.map(guiObject => {
        guiObject.updateDisplay();
      });
    });
  }

  static checkObjectIsEmpty(object, container) {
    console.log(object);

    if (Object.entries(object).length === 0 && object.constructor === Object) {
      container.querySelector('#loading').style.display = 'none';
      console.log(2);

      Config.isLoaded = true;
      return true;
    }
    return false;
  }
}
