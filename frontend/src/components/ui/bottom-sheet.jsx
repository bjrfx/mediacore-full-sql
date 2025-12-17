import * as React from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * BottomSheet Component - Mobile-first sliding sheet from bottom
 * Inspired by iOS/Android native sheets with smooth gestures
 */

const BottomSheetContext = React.createContext({});

const BottomSheet = ({ children, open, onOpenChange }) => {
  return (
    <BottomSheetContext.Provider value={{ open, onOpenChange }}>
      <AnimatePresence>
        {open && children}
      </AnimatePresence>
    </BottomSheetContext.Provider>
  );
};

const BottomSheetOverlay = React.forwardRef(({ className, ...props }, ref) => {
  const { onOpenChange } = React.useContext(BottomSheetContext);
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => onOpenChange?.(false)}
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
});
BottomSheetOverlay.displayName = "BottomSheetOverlay";

const BottomSheetContent = React.forwardRef(
  ({ className, children, showHandle = true, ...props }, ref) => {
    const { onOpenChange } = React.useContext(BottomSheetContext);
    const dragControls = useDragControls();
    const constraintsRef = React.useRef(null);
    
    const handleDragEnd = (event, info) => {
      // Close if dragged down more than 100px or with high velocity
      if (info.offset.y > 100 || info.velocity.y > 500) {
        onOpenChange?.(false);
      }
    };

    return (
      <>
        <BottomSheetOverlay />
        <div ref={constraintsRef} className="fixed inset-0 z-50 pointer-events-none" />
        <motion.div
          ref={ref}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ 
            type: "spring", 
            damping: 30, 
            stiffness: 300,
            mass: 0.8 
          }}
          drag="y"
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={handleDragEnd}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 max-h-[90vh] rounded-t-2xl",
            "bg-card border-t border-border shadow-2xl",
            "pointer-events-auto",
            className
          )}
          {...props}
        >
          {/* Drag handle */}
          {showHandle && (
            <div 
              className="flex justify-center py-4 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>
          )}
          
          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-56px)] pb-safe">
            {children}
          </div>
        </motion.div>
      </>
    );
  }
);
BottomSheetContent.displayName = "BottomSheetContent";

const BottomSheetHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 pb-4", className)}
    {...props}
  />
));
BottomSheetHeader.displayName = "BottomSheetHeader";

const BottomSheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
BottomSheetTitle.displayName = "BottomSheetTitle";

const BottomSheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground mt-1", className)}
    {...props}
  />
));
BottomSheetDescription.displayName = "BottomSheetDescription";

const BottomSheetClose = React.forwardRef(({ className, ...props }, ref) => {
  const { onOpenChange } = React.useContext(BottomSheetContext);
  
  return (
    <button
      ref={ref}
      onClick={() => onOpenChange?.(false)}
      className={cn(
        "absolute right-4 top-4 rounded-full p-2",
        "text-muted-foreground hover:text-foreground",
        "hover:bg-muted/50 transition-colors",
        className
      )}
      {...props}
    >
      <X className="h-5 w-5" />
      <span className="sr-only">Close</span>
    </button>
  );
});
BottomSheetClose.displayName = "BottomSheetClose";

const BottomSheetBody = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 py-2", className)}
    {...props}
  />
));
BottomSheetBody.displayName = "BottomSheetBody";

const BottomSheetFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 py-4 border-t border-border", className)}
    {...props}
  />
));
BottomSheetFooter.displayName = "BottomSheetFooter";

// Action item for the bottom sheet menu
const BottomSheetAction = React.forwardRef(
  ({ className, icon: Icon, children, destructive = false, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "w-full flex items-center gap-4 px-6 py-4",
        "text-left transition-colors",
        "hover:bg-muted/50 active:bg-muted",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        destructive && "text-destructive hover:bg-destructive/10",
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
      <span className="text-sm font-medium">{children}</span>
    </button>
  )
);
BottomSheetAction.displayName = "BottomSheetAction";

const BottomSheetSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("h-px bg-border my-2", className)}
    {...props}
  />
));
BottomSheetSeparator.displayName = "BottomSheetSeparator";

export {
  BottomSheet,
  BottomSheetOverlay,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetClose,
  BottomSheetBody,
  BottomSheetFooter,
  BottomSheetAction,
  BottomSheetSeparator,
};
