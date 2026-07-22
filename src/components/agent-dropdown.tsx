"use client";

import { cn } from "@/lib/utils";
import { Popover } from "@base-ui/react/popover";
import { Check, ChevronDown, Users } from "lucide-react";
import { useCallback, useRef, useState } from "react";

export interface AgentOption {
  id: string;
  full_name: string;
  email: string;
}

export interface AgentWithRole {
  id: string;
  full_name: string;
  email: string;
  role: "team_lead" | "participant" | "observer";
}

interface AgentDropdownProps {
  agents: AgentOption[];
  selectedAgents: AgentWithRole[];
  onChange: (agents: AgentWithRole[]) => void;
  disabled?: boolean;
}

const ROLE_OPTIONS: Array<{ value: AgentWithRole["role"]; label: string }> = [
  { value: "team_lead", label: "Team Lead" },
  { value: "participant", label: "Participant" },
  { value: "observer", label: "Observer" },
];

/**
 * Multi-select agent dropdown with role assignment.
 * Uses @base-ui/react Popover for the dropdown container.
 */
export function AgentDropdown({
  agents,
  selectedAgents,
  onChange,
  disabled = false,
}: AgentDropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isSelected = useCallback(
    (agentId: string) => selectedAgents.some((a) => a.id === agentId),
    [selectedAgents]
  );

  const getRole = useCallback(
    (agentId: string): AgentWithRole["role"] => {
      const found = selectedAgents.find((a) => a.id === agentId);
      return found?.role ?? "participant";
    },
    [selectedAgents]
  );

  const toggleAgent = useCallback(
    (agent: AgentOption) => {
      if (isSelected(agent.id)) {
        onChange(selectedAgents.filter((a) => a.id !== agent.id));
      } else {
        onChange([
          ...selectedAgents,
          { id: agent.id, full_name: agent.full_name, email: agent.email, role: "participant" },
        ]);
      }
    },
    [selectedAgents, onChange, isSelected]
  );

  const updateRole = useCallback(
    (agentId: string, role: AgentWithRole["role"]) => {
      onChange(
        selectedAgents.map((a) => (a.id === agentId ? { ...a, role } : a))
      );
    },
    [selectedAgents, onChange]
  );

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (agents.length === 0) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setActiveIndex((i) => Math.min(agents.length - 1, i + 1));
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setActiveIndex((i) => Math.max(0, i - 1));
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          const agent = agents[activeIndex];
          if (agent) {
            toggleAgent(agent);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
          break;
        }
      }
    },
    [agents, activeIndex, toggleAgent]
  );

  const triggerText =
    selectedAgents.length > 0
      ? `${selectedAgents.length} agents selected`
      : "Select agents";

  return (
    <div ref={containerRef} className="relative">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          ref={triggerRef}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors",
            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            open && "ring-2 ring-ring"
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span
              className={cn(
                "truncate",
                selectedAgents.length === 0 && "text-muted-foreground"
              )}
            >
              {triggerText}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </Popover.Trigger>

        <Popover.Portal container={containerRef}>
          <Popover.Positioner align="start" side="bottom" sideOffset={4}>
            <Popover.Popup
              className="z-[302] w-[var(--anchor-width)] rounded-xl border border-border bg-card shadow-lg shadow-black/10"
            >
              {agents.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No agents available
                </div>
              ) : (
                <div
                  ref={listRef}
                  role="listbox"
                  aria-multiselectable="true"
                  aria-label="Agent list"
                  tabIndex={0}
                  onKeyDown={handleListKeyDown}
                  className="max-h-[240px] overflow-y-auto p-1"
                >
                  {agents.map((agent, index) => {
                    const selected = isSelected(agent.id);
                    const isActive = index === activeIndex;
                    const currentRole = getRole(agent.id);

                    return (
                      <div
                        key={agent.id}
                        role="option"
                        aria-selected={selected}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => toggleAgent(agent)}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                          isActive ? "bg-muted" : "hover:bg-muted/50"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            selected
                              ? "border-primary bg-primary"
                              : "border-border bg-card"
                          )}
                        >
                          {selected && (
                            <Check className="h-3 w-3 text-primary-foreground" aria-hidden="true" />
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium text-foreground">
                            {agent.full_name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {agent.email}
                          </span>
                        </div>

                        {selected && (
                          <select
                            aria-label={`Role for ${agent.full_name}`}
                            value={currentRole}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              updateRole(agent.id, e.target.value as AgentWithRole["role"])
                            }
                            className="ml-auto shrink-0 rounded border border-border bg-card px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
