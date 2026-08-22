import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

const interactiveSelector = [
  "button",
  "a",
  '[role="button"]',
  "input",
  "select",
  "textarea",
  ".spotify-widget__controls",
  ".discord-widget__notification",
].join(",");

const ignoreSelector = [
  ".settings-button",
  ".settings-modal",
  "[data-no-cursor-restore]",
].join(",");

export function useCursorRestore() {
  useEffect(() => {
    let isInteracting = false;
    let timers: number[] = [];

    async function rememberCursorPosition() {
      if (isInteracting) return;

      try {
        await invoke("remember_cursor_position");
      } catch {
        // Komfortfunktion. Fehler ignorieren.
      }
    }

    async function restoreCursorPosition() {
      try {
        await invoke("restore_cursor_position");
      } catch (error) {
        console.warn("Mauszeiger konnte nicht zurückgesetzt werden:", error);
      }
    }

    function shouldIgnoreTarget(target: EventTarget | null) {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest(ignoreSelector));
    }

    function isInteractiveTarget(target: EventTarget | null) {
      if (!(target instanceof Element)) return false;
      if (shouldIgnoreTarget(target)) return false;

      return Boolean(target.closest(interactiveSelector));
    }

    function clearRestoreTimers() {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }

      timers = [];
    }

    function startInteraction(target: EventTarget | null) {
      if (!isInteractiveTarget(target)) return;

      isInteracting = true;
      clearRestoreTimers();
    }

    function scheduleRestore() {
      if (!isInteracting) return;

      clearRestoreTimers();

      for (const delay of [120, 260, 520, 900, 1400]) {
        timers.push(
          window.setTimeout(() => {
            restoreCursorPosition();
          }, delay),
        );
      }

      timers.push(
        window.setTimeout(() => {
          isInteracting = false;
        }, 1700),
      );
    }

    function handlePointerDown(event: PointerEvent) {
      startInteraction(event.target);
    }

    function handlePointerUp() {
      scheduleRestore();
    }

    function handlePointerCancel() {
      scheduleRestore();
    }

    function handleMouseDown(event: MouseEvent) {
      startInteraction(event.target);
    }

    function handleMouseUp() {
      scheduleRestore();
    }

    function handleClick(event: MouseEvent) {
      if (!isInteractiveTarget(event.target)) return;

      isInteracting = true;
      scheduleRestore();
    }

    function handleTouchStart(event: TouchEvent) {
      startInteraction(event.target);
    }

    function handleTouchEnd() {
      scheduleRestore();
    }

    function handleTouchCancel() {
      scheduleRestore();
    }

    const rememberTimer = window.setInterval(rememberCursorPosition, 300);

    rememberCursorPosition();

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("pointercancel", handlePointerCancel, true);

    window.addEventListener("mousedown", handleMouseDown, true);
    window.addEventListener("mouseup", handleMouseUp, true);
    window.addEventListener("click", handleClick, true);

    window.addEventListener("touchstart", handleTouchStart, true);
    window.addEventListener("touchend", handleTouchEnd, true);
    window.addEventListener("touchcancel", handleTouchCancel, true);

    return () => {
      window.clearInterval(rememberTimer);
      clearRestoreTimers();

      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerCancel, true);

      window.removeEventListener("mousedown", handleMouseDown, true);
      window.removeEventListener("mouseup", handleMouseUp, true);
      window.removeEventListener("click", handleClick, true);

      window.removeEventListener("touchstart", handleTouchStart, true);
      window.removeEventListener("touchend", handleTouchEnd, true);
      window.removeEventListener("touchcancel", handleTouchCancel, true);
    };
  }, []);
}
