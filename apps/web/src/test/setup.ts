import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();

  const storage = window.localStorage;

  if (!storage) {
    return;
  }

  if (typeof storage.clear === "function") {
    storage.clear();
    return;
  }

  const removeItem =
    typeof storage.removeItem === "function" ? storage.removeItem.bind(storage) : undefined;

  Object.keys(storage).forEach((key) => {
    if (removeItem) {
      removeItem(key);
      return;
    }

    delete (storage as Record<string, unknown>)[key];
  });
});
