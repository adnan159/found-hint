import { useTheme } from "@/components/theme-provider";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner } from "sonner";

const Toaster = (props) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="fhint:toaster fhint:group"
      icons={{
        success: <CircleCheckIcon className="fhint:size-4" />,
        info: <InfoIcon className="fhint:size-4" />,
        warning: <TriangleAlertIcon className="fhint:size-4" />,
        error: <OctagonXIcon className="fhint:size-4" />,
        loading: <Loader2Icon className="fhint:size-4 fhint:animate-spin" />,
      }}
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "var(--radius)",
      }}
      {...props}
    />
  );
};

export { Toaster };
