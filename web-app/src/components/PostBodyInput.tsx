import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value"> & {
  value: string;
  characterLimit: number;
  limitReady: boolean;
};

/** Keep the native textarea for selection, IME and accessibility; mirror text for inline marks. */
export function PostBodyInput({ value, characterLimit, limitReady, className = "", style, ...props }: Props) {
  const mirror = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (mirror.current && input.current) {
      mirror.current.scrollTop = input.current.scrollTop;
      mirror.current.scrollLeft = input.current.scrollLeft;
    }
  });
  const characters = Array.from(value);
  const overflow = limitReady && characters.length > characterLimit;
  const sharedStyle = {
    ...style,
    whiteSpace: "pre-wrap" as const,
    overflowWrap: "break-word" as const,
    wordBreak: "normal" as const,
    scrollbarWidth: "none" as const,
  };
  return (
    <div className="relative min-w-0 flex-1">
      <div
        ref={mirror}
        aria-hidden="true"
        className={`${className} pointer-events-none absolute inset-0 overflow-hidden`}
        style={{ ...sharedStyle, height: "100%" }}
      >
        {overflow ? <>{characters.slice(0, characterLimit).join("")}<mark className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">{characters.slice(characterLimit).join("")}</mark></> : value}
        {"\n"}
      </div>
      <textarea
        {...props}
        ref={input}
        value={value}
        className={`${className} relative block caret-foreground`}
        style={{ ...sharedStyle, color: "transparent", backgroundColor: "transparent" }}
        onScroll={(event) => {
          if (mirror.current) {
            mirror.current.scrollTop = event.currentTarget.scrollTop;
            mirror.current.scrollLeft = event.currentTarget.scrollLeft;
          }
          props.onScroll?.(event);
        }}
      />
    </div>
  );
}
