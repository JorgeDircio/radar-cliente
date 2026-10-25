import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ActionState } from "@/lib/discovery/model"

export function ActionFeedback({ state }: { state: ActionState }) {
  if (state.error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    )
  if (state.success)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {state.success}
      </p>
    )
  return null
}
