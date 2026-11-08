// Local shadcn/ui-style composition of the Radix Dialog primitive.
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../lib/utils';
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export function DialogContent({ children, className, closeLabel = 'Close wallet dialog', ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { closeLabel?: string }) {
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="dialog-overlay" /><DialogPrimitive.Content className={cn('dialog-content', className)} {...props}>
    {children}<DialogPrimitive.Close className="dialog-close" aria-label={closeLabel}>×</DialogPrimitive.Close>
  </DialogPrimitive.Content></DialogPrimitive.Portal>;
}
