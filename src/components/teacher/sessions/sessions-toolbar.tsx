"use client";

import { Loader2, Search, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SessionsToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  classFilter: string;
  onClassFilterChange: (classId: string) => void;
  classes: Array<{ id: string; name: string; subject: string }>;
  totalSessions: number;
  hasActiveFilters: boolean;
  isLoading: boolean;
  onClearFilters: () => void;
}

export function SessionsToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  classFilter,
  onClassFilterChange,
  classes,
  totalSessions,
  hasActiveFilters,
  isLoading,
  onClearFilters,
}: SessionsToolbarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search by student, class, or title…"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-9 pr-9"
          aria-label="Search sessions"
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Status */}
      <div className="w-full lg:w-auto min-w-[160px]">
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-full" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
            <Filter className="h-4 w-4 ml-auto text-muted-foreground" aria-hidden="true" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="abandoned">Abandoned</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Class */}
      <div className="w-full lg:w-auto min-w-[180px]">
        <Select value={classFilter} onValueChange={onClassFilterChange}>
          <SelectTrigger className="w-full" aria-label="Filter by class">
            <SelectValue placeholder="All classes" />
            <Filter className="h-4 w-4 ml-auto text-muted-foreground" aria-hidden="true" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
                {cls.subject ? ` — ${cls.subject}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Result count + clear */}
      <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
        <span
          className="text-sm text-muted-foreground inline-flex items-center gap-2"
          aria-live="polite"
        >
          {isLoading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          )}
          {totalSessions} {totalSessions === 1 ? "session" : "sessions"}
          {hasActiveFilters ? " matching" : ""}
        </span>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1">
            <X className="h-4 w-4" aria-hidden="true" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
