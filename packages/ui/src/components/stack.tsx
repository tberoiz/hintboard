import * as React from "react";

import { cn } from "#lib/utils.js";

const Stack = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    direction?: "row" | "column" | "row-reverse" | "column-reverse";
    gap?: number | string;
    align?: "start" | "center" | "end" | "stretch" | "baseline";
    justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
    wrap?: "wrap" | "nowrap" | "wrap-reverse";
    separator?: React.ReactElement;
  }
>(
  (
    {
      className,
      direction = "column",
      gap = 0,
      align,
      justify,
      wrap,
      separator,
      children,
      ...props
    },
    ref,
  ) => {
    const gapValue = typeof gap === "number" ? `${gap * 0.25}rem` : gap;

    const flexDirection =
      {
        row: "flex-row",
        column: "flex-col",
        "row-reverse": "flex-row-reverse",
        "column-reverse": "flex-col-reverse",
      }[direction] || "flex-col";

    const alignItems = align
      ? {
          start: "items-start",
          center: "items-center",
          end: "items-end",
          stretch: "items-stretch",
          baseline: "items-baseline",
        }[align]
      : undefined;

    const justifyContent = justify
      ? {
          start: "justify-start",
          center: "justify-center",
          end: "justify-end",
          between: "justify-between",
          around: "justify-around",
          evenly: "justify-evenly",
        }[justify]
      : undefined;

    const flexWrap = wrap
      ? {
          wrap: "flex-wrap",
          nowrap: "flex-nowrap",
          "wrap-reverse": "flex-wrap-reverse",
        }[wrap]
      : undefined;

    const baseClasses = [
      "flex",
      flexDirection,
      alignItems && alignItems,
      justifyContent && justifyContent,
      flexWrap && flexWrap,
    ]
      .filter(Boolean)
      .join(" ");

    // If no separator, render normally
    if (!separator) {
      return (
        <div
          ref={ref}
          className={cn(baseClasses, className)}
          style={{ gap: gapValue }}
          {...props}
        >
          {children}
        </div>
      );
    }

    // With separator, we need to wrap each child
    const childrenArray = React.Children.toArray(children);

    return (
      <div
        ref={ref}
        className={cn(baseClasses, className)}
        style={{ gap: gapValue }}
        {...props}
      >
        {childrenArray.map((child, index) => (
          <React.Fragment key={index}>
            {child}
            {index < childrenArray.length - 1 && separator}
          </React.Fragment>
        ))}
      </div>
    );
  },
);
Stack.displayName = "Stack";

const HStack = React.forwardRef<
  HTMLDivElement,
  Omit<React.ComponentProps<typeof Stack>, "direction">
>((props, ref) => <Stack ref={ref} direction="row" {...props} />);
HStack.displayName = "HStack";

const VStack = React.forwardRef<
  HTMLDivElement,
  Omit<React.ComponentProps<typeof Stack>, "direction">
>((props, ref) => <Stack ref={ref} direction="column" {...props} />);
VStack.displayName = "VStack";

export { Stack, HStack, VStack };
