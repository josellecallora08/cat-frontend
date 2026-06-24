"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Optional leading icon shown in the trigger */
  icon?: React.ReactNode;
  /** Optional aria-label when there's no visible <label> */
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** Trigger size; "sm" matches compact filter bars */
  size?: "sm" | "md";
}

/**
 * Accessible, animated dropdown that matches the app's design language.
 * Replaces native <select> elements whose option lists can't be styled.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  icon,
  ariaLabel,
  id,
  disabled,
  className,
  size = "md",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  // When opening, focus the active item
  useEffect(() => {
    if (open) {
      setActiveIndex(selectedIndex);
      requestAnimationFrame(() => {
        listRef.current
          ?.querySelectorAll<HTMLElement>("[role='option']")
          [selectedIndex]?.scrollIntoView({ block: "nearest" });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commit = (index: number) => {
    const opt = options[index];
    if (opt) {
      onChange(opt.value);
      setOpen(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "ring-2 ring-ring",
          size === "sm" ? "px-2.5 py-1.5" : "px-3 py-2"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          id={listId}
          aria-activedescendant={`${listId}-${activeIndex}`}
          tabIndex={-1}
          className={cn(
            "absolute right-0 z-50 mt-2 max-h-72 w-full min-w-[12rem] overflow-auto rounded-xl border border-border bg-card p-1 shadow-lg shadow-black/10",
            "origin-top animate-[select-in_0.16s_ease-out]"
          )}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === activeIndex;
            return (
              <li
                key={opt.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-muted text-foreground" : "text-muted-foreground",
                  isSelected && "font-medium text-foreground"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <style jsx>{`
        @keyframes select-in {
          from {
            opacity: 0;
            transform: translateY(-4px) scaleY(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}
