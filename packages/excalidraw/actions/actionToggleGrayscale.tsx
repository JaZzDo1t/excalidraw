import { isImageElement, newElementWith, CaptureUpdateAction } from "@excalidraw/element";

import { register } from "./register";
import { getFormValue } from "./actionProperties";
import { Range } from "../components/Range";

export const actionToggleGrayscale = register<number>({
  name: "changeSaturation",
  label: "labels.saturation",
  trackEvent: false,
  perform: (elements, appState, value) => {
    return {
      elements: elements.map((el) => {
        if (
          appState.selectedElementIds[el.id] &&
          isImageElement(el)
        ) {
          return newElementWith(el, {
            filters: {
              ...((el as any).filters || {}),
              saturation: value,
            },
          } as any);
        }
        return el;
      }),
      appState,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  predicate: (_elements, appState, _props, app) => {
    const selected = app.scene.getSelectedElements(appState);
    return selected.some((el) => isImageElement(el));
  },
  PanelComponent: ({ elements, appState, app, updateData }) => {
    const saturation = getFormValue(
      elements,
      app,
      (element) =>
        isImageElement(element)
          ? (element as any).filters?.saturation ?? 100
          : undefined,
      (element) => isImageElement(element),
      () => 100,
    );

    if (saturation === undefined) {
      return null;
    }

    return (
      <Range
        label="Цветность"
        value={saturation ?? 100}
        hasCommonValue={saturation !== null}
        onChange={updateData}
        min={0}
        max={100}
        step={5}
        testId="saturation"
      />
    );
  },
});
