import { Card } from "@/components/ui/surfaces"
import { cn } from "@/lib/cn"

export interface SettingsSectionProps {
  title: string
  lead?: string
  icon?: React.ReactNode
  tone?: "default" | "danger"
  children: React.ReactNode
}

export function SettingsSection({
  title,
  lead,
  icon,
  tone = "default",
  children,
}: SettingsSectionProps): React.JSX.Element {
  return (
    <Card className={cn("flex flex-col gap-4 p-6", tone === "danger" && "border-danger")}>
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          {icon}
          {title}
        </h2>
        {lead ? <p className="text-sm text-muted">{lead}</p> : null}
      </div>
      {children}
    </Card>
  )
}
