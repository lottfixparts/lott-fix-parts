import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-medium transition-colors " +
          "border-gray-300 bg-white hover:bg-gray-50 active:scale-[.99] " +
          className
        }
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
export default Button;
