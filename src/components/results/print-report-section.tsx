import type { HTMLAttributes, ReactNode } from "react";

interface PrintReportSectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  sectionName: string;
}

/** Wraps one report section with stable print pagination semantics. */
export function PrintReportSection({
  children,
  className,
  sectionName,
  ...props
}: PrintReportSectionProps) {
  const classes = ["report-print-section", className].filter(Boolean).join(" ");

  return (
    <section
      aria-label={sectionName}
      className={classes}
      data-report-section={sectionName}
      {...props}
    >
      {children}
    </section>
  );
}
