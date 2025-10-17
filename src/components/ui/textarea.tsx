import * as React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className = "", ...props }, ref) => (
  <textarea
    ref={ref}
    className={
      "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none " +
      "focus:ring-2 focus:ring-gray-300 " + className
    }
    {...props}
  />
));
Textarea.displayName = "Textarea";
