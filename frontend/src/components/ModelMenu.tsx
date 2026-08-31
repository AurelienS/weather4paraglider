import { Fragment, useEffect, useRef, useState } from "react";
import { entryKey, modelEntries } from "../lib/compare";
import { interpolate } from "../lib/i18n";
import { MODELS, MODEL_GROUP_ORDER, type ModelGroup } from "../api/models";
import { useI18n } from "../i18nContext";
import { useStore } from "../stores";

/** Model picker for the compare board: toggling a model adds or removes a
 * card showing the current place as forecast by that model. The rows and
 * groups mirror the main model dropdown. The menu stays open so several
 * models can be toggled in one go. */
export function ModelMenu() {
  const { t } = useI18n();
  const entries = useStore((s) => s.entries);
  const onBoard = new Set(modelEntries(entries));
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function toggle(modelId: (typeof MODELS)[number]["id"]) {
    if (onBoard.has(modelId)) {
      useStore.getState().removeEntry(entryKey({ kind: "model", modelId }));
    } else {
      useStore.getState().addModelToBoard(modelId);
    }
  }

  const GROUP_LABEL: Record<ModelGroup, string> = {
    nowcast: t.modelGroupNowcast,
    lowLevel: t.modelGroupLowLevel,
    allAltitude: t.modelGroupAllAltitude,
    longRange: t.modelGroupLongRange,
  };

  return (
    <div className="model-menu" ref={boxRef}>
      <button
        type="button"
        className="btn"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        {interpolate(t.models, { n: onBoard.size })}
      </button>
      {open ? (
        <ul className="fav-list" role="menu">
          {MODEL_GROUP_ORDER.map((group) => (
            <Fragment key={group}>
              <li role="none" className="fav-group">
                {GROUP_LABEL[group]}
              </li>
              {MODELS.filter((m) => m.group === group).map((model) => {
                const on = onBoard.has(model.id);
                return (
                  <li key={model.id} role="none" className={on ? "is-on" : undefined}>
                    <button
                      type="button"
                      role="menuitem"
                      className="fav-item"
                      onClick={() => toggle(model.id)}
                    >
                      <span className="fav-row">
                        <span className="fav-label">{model.label}</span>
                        {on ? <span className="fav-check">✓</span> : null}
                      </span>
                      <span className="fav-coords">
                        {interpolate(t.daysSuffix, { n: model.days })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </Fragment>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
