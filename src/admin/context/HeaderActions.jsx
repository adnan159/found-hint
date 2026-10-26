import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A place in the top bar for the screen below it to put its own buttons.
 *
 * The bar is drawn once by the root layout and knows nothing about the
 * screen under it; a screen that wants a button beside "Switch location" —
 * Reviews' "Sync" — renders it through `<HeaderActions>`, which portals it
 * into the bar. The button stays part of the screen's own React tree, so it
 * uses the screen's state and goes away with the screen.
 */
const HeaderActionsContext = createContext(null);

export function HeaderActionsProvider({ children }) {
  const [slot, setSlot] = useState(null);

  return (
    <HeaderActionsContext.Provider value={{ slot, setSlot }}>
      {children}
    </HeaderActionsContext.Provider>
  );
}

/** Where the bar puts the screen's buttons. Renders nothing of its own. */
export function HeaderActionsSlot() {
  const context = useContext(HeaderActionsContext);

  return context ? (
    <span ref={context.setSlot} className="fhint:contents" />
  ) : null;
}

/** A screen's buttons for the bar. Nothing until the bar is on the page. */
export function HeaderActions({ children }) {
  const context = useContext(HeaderActionsContext);

  return context?.slot ? createPortal(children, context.slot) : null;
}

export default HeaderActions;
