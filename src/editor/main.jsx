import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { store } from "@/store";
import EditorShare from "./EditorShare";
import { registerToolbarButton } from "./toolbar";
import "./editor.css";

/**
 * The GBP Posting popup in the block editor (FoundHint Premium,
 * `posts.blog`): a button in the editor's top bar opens the Posts composer
 * on the blog post being edited.
 *
 * The popup is this bundle's own React tree, in a host appended to <body>
 * (`.fhint-ui`, where its styles are scoped). The toolbar button itself is
 * built with WordPress's React (`wp.element`), so it lives in the editor's
 * tree; the two only meet through `open()`.
 */
let root = null;
let opened = 0;

function render(postId) {
  if (!root) {
    const host = document.createElement("div");

    host.className = "fhint-ui";
    document.body.appendChild(host);
    root = createRoot(host);
  }

  opened += 1;

  root.render(
    <Provider store={store}>
      <ThemeProvider defaultTheme="light" storageKey="fhint-ui-theme">
        <TooltipProvider>
          {postId ? (
            <EditorShare
              key={opened}
              postId={postId}
              onClose={() => render(0)}
            />
          ) : null}
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </ThemeProvider>
    </Provider>,
  );
}

registerToolbarButton((postId) => render(postId));
