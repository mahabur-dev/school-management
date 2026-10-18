import type { ReactNode } from "react";
import styles from "./page-header.module.css";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

/** Shared heading hierarchy for dashboard management pages. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </header>
  );
}
