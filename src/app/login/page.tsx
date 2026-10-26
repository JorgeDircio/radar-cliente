import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Radar de Clientes</CardTitle>
          <CardDescription>Inicia sesión para ver tus prospectos</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LoginForm />
          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta? <Link href="/signup" className="underline underline-offset-4">Crear una</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
