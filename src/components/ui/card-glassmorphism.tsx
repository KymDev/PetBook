import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Glass Card Component - iOS Glassmorphism Design
 * Implementa o efeito de vidro fosco seguindo os princípios de design da Apple
 * com transparência, backdrop blur, camadas e bordas sutis.
 */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'light' | 'strong' | 'accent';
  glass?: boolean;
  shadow?: 'sm' | 'md' | 'lg';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', glass = true, shadow = 'md', ...props }, ref) => {
    const glassClasses = glass ? {
      default: 'glass-card',
      light: 'glass-card-light',
      strong: 'glass-card-strong',
      accent: 'glass-accent',
    }[variant] : '';

    const shadowClasses = {
      sm: 'glass-shadow-sm',
      md: 'glass-shadow-md',
      lg: 'glass-shadow-lg',
    }[shadow];

    return (
      <div
        ref={ref}
        className={cn(
          glass ? glassClasses : 'rounded-lg border bg-card text-card-foreground shadow-sm',
          glass && shadowClasses,
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5 p-6 glass-header border-b border-white/20 dark:border-white/10",
        className
      )}
      {...props}
    />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        "text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "p-6 pt-0 glass-content border-b border-white/20 dark:border-white/10",
        className
      )}
      {...props}
    />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center p-6 pt-0 glass-footer border-t border-white/20 dark:border-white/10",
        className
      )}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
