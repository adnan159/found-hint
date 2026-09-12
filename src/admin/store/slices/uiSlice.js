import { createSlice } from "@reduxjs/toolkit";

/**
 * Placeholder UI slice (sidebar state, active filters, dialog open/closed —
 * whatever cross-page UI state accumulates). Empty on purpose; add reducers
 * as real pages need them rather than pre-guessing shape here.
 */
const uiSlice = createSlice({
  name: "ui",
  initialState: {},
  reducers: {},
});

export default uiSlice.reducer;
