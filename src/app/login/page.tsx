import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Radar de Clientes</CardTitle>
          <CardDescription>Inicia sesión para ver tus prospectos</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  )
}
