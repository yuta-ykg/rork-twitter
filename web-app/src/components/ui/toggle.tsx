import * as TogglePrimitive from "@radix-ui/react-toggle";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";
import { toggleVariants } from "@/components/ui/toggle.variants";

const Toggle = ({
  ref,
  className,
  variant,
  size,
  ...props
}: React.ComponentPropsWithRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ variant, size, className }))} {...props} />
);

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle };
