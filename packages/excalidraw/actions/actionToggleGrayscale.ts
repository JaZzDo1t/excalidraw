import { isImageElement } from "@excalidraw/element";
import { newElementWith } from "@excalidraw/element";

import { register } from "./register";

export const actionToggleGrayscale = register({
  name: "toggleGrayscale",
  label: "Toggle grayscale",
  trackEvent: { category: "element", action: "toggleGrayscale" },
  perform(elements, appState, _, app) {
    const selectedIds = new Set(Object.keys(appState.selectedElementIds));
    const nextElements = elements.map((el) => {
      if (selectedIds.has(el.id) && isImageElement(el)) {
        const currentGrayscale = (el as any).filters?.grayscale ?? false;
        return newElementWith(el, {
          filters: { ...((el as any).filters || {}), grayscale: !currentGrayscale },
        } as any);
      }
      return el;
    });
    return {
      elements: nextElements,
      appState,
      captureUpdate: true,
    };
  },
  predicate: (_elements, appState, _props, app) => {
    const selectedElements = app.scene.getSelectedElements(appState);
    return (
      selectedElements.length >= 1 &&
      selectedElements.some((el) => isImageElement(el))
    );
  },
});
