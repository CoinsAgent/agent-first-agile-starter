import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
const buttonVariants = cva('button', { variants: { variant: { default: '', secondary: 'button-secondary', ghost: 'button-ghost' } }, defaultVariants: { variant: 'default' } });
export function Button({ className, variant, type = 'button', ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return <button type={type} className={cn(buttonVariants({ variant }), className)} {...props} />;
}
