import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={
      "flex h-9 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none " +
      "focus:ring-2 focus:ring-gray-300 " + className
    }
    {...props}
  />
));
Input.displayName = "Input";
