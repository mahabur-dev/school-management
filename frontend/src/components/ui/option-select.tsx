"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { AppIcon } from "./app-icon";
import styles from "./option-select.module.css";

export type SelectOption = {
  label: string;
  value: string;
};

type OptionSelectProps = {
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder: string;
  value: string;
};

type MenuPosition = {
  placement: "top" | "bottom";
  style: CSSProperties;
};

const MENU_GAP = 7;
const MENU_MAX_HEIGHT = 218;
const VIEWPORT_PADDING = 12;

/**
 * A consistent, keyboard-friendly single-value select for application forms.
 * It deliberately avoids native select menus, whose option styling differs by
 * browser and operating system.
 */
export function OptionSelect({
  ariaLabel,
  disabled = false,
  onChange,
  options,
  placeholder,
  value,
}: OptionSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function closeOnOutsidePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !controlRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("mousedown", closeOnOutsidePointer);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    function positionMenu() {
      const control = controlRef.current;
      if (!control) return;
      const rect = control.getBoundingClientRect();
      const availableBelow =
        window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_PADDING;
      const availableAbove = rect.top - MENU_GAP - VIEWPORT_PADDING;
      const placement =
        availableBelow < 160 && availableAbove > availableBelow
          ? "top"
          : "bottom";
      const available =
        placement === "top" ? availableAbove : availableBelow;
      const width = Math.min(rect.width, window.innerWidth - VIEWPORT_PADDING * 2);
      const left = Math.min(
        Math.max(rect.left, VIEWPORT_PADDING),
        window.innerWidth - width - VIEWPORT_PADDING,
      );

      setMenuPosition({
        placement,
        style: {
          left,
          width,
          maxHeight: Math.max(80, Math.min(MENU_MAX_HEIGHT, available)),
          ...(placement === "top"
            ? { bottom: window.innerHeight - rect.top + MENU_GAP }
            : { top: rect.bottom + MENU_GAP }),
        },
      });
    }

    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [open]);

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  function moveSelection(direction: 1 | -1) {
    const currentIndex = options.findIndex((option) => option.value === value);
    const nextIndex =
      currentIndex === -1
        ? direction === 1
          ? 0
          : options.length - 1
        : Math.min(Math.max(currentIndex + direction, 0), options.length - 1);
    const option = options[nextIndex];
    if (option) choose(option.value);
  }

  return (
    <div className={styles.root} ref={controlRef}>
      <button
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={styles.trigger}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (open) moveSelection(event.key === "ArrowDown" ? 1 : -1);
            else setOpen(true);
          }
        }}
        type="button"
      >
        <span className={selected ? styles.selectedValue : styles.placeholder}>
          {selected?.label ?? placeholder}
        </span>
        <AppIcon name="chevron-down" />
      </button>
      {open && menuPosition
        ? createPortal(
        <div
          className={styles.menu}
          data-placement={menuPosition.placement}
          id={listboxId}
          ref={menuRef}
          role="listbox"
          style={menuPosition.style}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                aria-selected={isSelected}
                className={isSelected ? styles.optionSelected : styles.option}
                key={option.value}
                onClick={() => choose(option.value)}
                role="option"
                type="button"
              >
                <span>{option.label}</span>
                {isSelected ? <AppIcon name="check" /> : null}
              </button>
            );
          })}
        </div>,
        document.body,
      )
        : null}
    </div>
  );
}
