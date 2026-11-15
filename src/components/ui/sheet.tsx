"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & { side?: "top" | "right" | "bottom" | "left" }
>(({ className, side = "bottom", children, ...props }, ref) => (
  <SheetPrimitive.Portal>
    <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in" />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 grid gap-1 md:grid-cols-0 md:grid-rows-0 lg:gap-0 lg:grid-cols-2 lg:grid-rows-2",
        side === "bottom"
          ? "bottom-0 left-0 w-full border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom"
          : side === "right"
            ? "right-0 top-0 h-full border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
            : side === "top"
              ? "top-0 left-0 w-full border-b data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top"
              : "left-0 top-0 h-full border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
        className
      )}
      {...props}
    >
      {children}
    </SheetPrimitive.Content>
  </SheetPrimitive.Portal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

export { Sheet, SheetContent, SheetTrigger };