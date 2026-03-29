import * as React from "react"
import { cn } from "@/lib/utils"

interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PopoverContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function Popover({ children, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (value: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(value);
    }
    onOpenChange?.(value);
  };
  
  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      {children}
    </PopoverContext.Provider>
  );
}

interface PopoverTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

export function PopoverTrigger({ children, asChild, className }: PopoverTriggerProps) {
  const { open, setOpen } = React.useContext(PopoverContext);
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: handleClick,
      className: cn((children as React.ReactElement).props.className, className),
    });
  }
  
  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}

interface PopoverContentProps {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  style?: React.CSSProperties;
}

export function PopoverContent({ 
  children, 
  className, 
  align = "center",
  sideOffset = 4,
  style
}: PopoverContentProps) {
  const { open, setOpen } = React.useContext(PopoverContext);
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, setOpen]);
  
  if (!open) return null;
  
  const alignClass = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0"
  }[align];
  
  return (
    <div
      ref={ref}
      style={{ marginTop: sideOffset, ...style }}
      className={cn(
        "absolute z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none",
        alignClass,
        className
      )}
    >
      {children}
    </div>
  );
}
