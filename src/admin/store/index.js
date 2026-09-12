import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { baseApi } from "./api/baseApi";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

/** @type {() => import('@reduxjs/toolkit').AppDispatch} */
export const useAppDispatch = () => useDispatch();

/** @type {import('react-redux').TypedUseSelectorHook<ReturnType<typeof store.getState>>} */
export const useAppSelector = useSelector;
