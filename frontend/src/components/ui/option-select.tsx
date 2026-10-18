"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  const controlRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function closeOnOutsidePointer(event: MouseEvent) {
      if (!controlRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("mousedown", closeOnOutsidePointer);
  }, []);

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
      {open ? (
        <div className={styles.menu} id={listboxId} role="listbox">
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
        </div>
      ) : null}
    </div>
  );
}
