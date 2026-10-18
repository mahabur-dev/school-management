"use client";

import { AppIcon } from "./app-icon";
import styles from "./search-input.module.css";

type SearchInputProps = {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

/** Shared search control for directory and management-page toolbars. */
export function SearchInput({
  label,
  onChange,
  placeholder,
  value,
}: SearchInputProps) {
  return (
    <label className={styles.root}>
      <span className={styles.srOnly}>{label}</span>
      <AppIcon name="search" />
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {value ? (
        <button
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={() => onChange("")}
          type="button"
        >
          <AppIcon name="x" />
        </button>
      ) : null}
    </label>
  );
}
